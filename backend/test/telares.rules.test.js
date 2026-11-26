'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const models = require('../src/database/models');
const telaresService = require('../src/modules/telares/telares.service');
const { validateOperatorWeightCoverage, validateOutputMeasures, getBomPtiProductIds, assertPtiIncludedInBom } = require('../src/modules/telares/productionRules');

test('normalizeProductionRoute valida destinos de Diagrama 1 (ROLLO_TELA) y bloquea GLOBO', () => {
  assert.deepEqual(
    telaresService.normalizeProductionRoute(['TELARES', 'LAMINADO', 'CORTE'], 'ROLLO_TELA'),
    ['TELARES', 'LAMINADO', 'CORTE']
  );
  assert.deepEqual(
    telaresService.normalizeProductionRoute(['TELARES', 'LONAS'], 'ROLLO_TELA'),
    ['TELARES', 'LONAS']
  );
  assert.deepEqual(
    telaresService.normalizeProductionRoute(['TELARES', 'Venta de rollo'], 'ROLLO_TELA'),
    ['TELARES', 'VENTA']
  );
  assert.deepEqual(
    telaresService.normalizeProductionRoute(['TELARES', 'Almacén'], 'ROLLO_TELA'),
    ['TELARES', 'ALMACEN']
  );

  assert.throws(
    () => telaresService.normalizeProductionRoute(['TELARES', 'GLOBO', 'CORTE'], 'ROLLO_TELA'),
    (err) => err.statusCode === 400 && err.code === 'GLOBO_NOT_ALLOWED_FOR_TELARES_OUTPUT'
  );
});

test('normalizeProductionRoute valida destinos de Diagrama 2 (BANDA y CINTA) y bloquea GLOBO/LAMINADO', () => {
  assert.deepEqual(
    telaresService.normalizeProductionRoute(['TELARES', 'Corte de banda'], 'BANDA'),
    ['TELARES', 'CORTE']
  );
  assert.deepEqual(
    telaresService.normalizeProductionRoute(['TELARES', 'Almacén'], 'BANDA'),
    ['TELARES', 'ALMACEN']
  );
  assert.deepEqual(
    telaresService.normalizeProductionRoute(['TELARES', 'Venta directa'], 'CINTA'),
    ['TELARES', 'VENTA']
  );

  assert.throws(
    () => telaresService.normalizeProductionRoute(['TELARES', 'GLOBO', 'CORTE'], 'BANDA'),
    (err) => err.statusCode === 400 && err.code === 'GLOBO_NOT_ALLOWED_FOR_TELARES_OUTPUT'
  );
  assert.throws(
    () => telaresService.normalizeProductionRoute(['TELARES', 'LAMINADO', 'CORTE'], 'CINTA'),
    (err) => err.statusCode === 400 && err.code === 'INVALID_BANDA_CINTA_ROUTE'
  );
});

test('calculateBomPtiDemand calcula demanda teórica de PTI por metros y por peso', () => {
  const bom = {
    code: 'BOM-TEL-6.5-TUB',
    target_weight_g_per_m: 85,
    expected_output_quantity: 1,
    expected_output_unit: 'ROLLO',
    standard_output_meters: 500,
    items: [
      {
        id: 1,
        role: 'URDIMBRE',
        pti_product_id: 10,
        ratio_percentage: 48,
        consumption_g_per_m: 40.8,
        required_quantity: null,
        required_unit: 'KG',
        ptiProduct: { id: 10, code: 'PTI-URD-2100', unit_weight_kg: 6.8 },
      },
      {
        id: 2,
        role: 'TRAMA',
        pti_product_id: 11,
        ratio_percentage: 48,
        consumption_g_per_m: 40.8,
        required_quantity: null,
        required_unit: 'KG',
        ptiProduct: { id: 11, code: 'PTI-TRA-2000', unit_weight_kg: 6.8 },
      },
      {
        id: 3,
        role: 'REFUERZO',
        pti_product_id: 12,
        ratio_percentage: 4,
        consumption_g_per_m: 3.4,
        required_quantity: null,
        required_unit: 'KG',
        ptiProduct: { id: 12, code: 'PTI-CIN-2300-ROJO', unit_weight_kg: 6.8 },
      },
    ],
  };

  const demands = telaresService.calculateBomPtiDemand(bom, 500);
  assert.equal(demands.length, 3);
  assert.equal(demands[0].requiredKg, 20.4);
  assert.equal(demands[1].requiredKg, 20.4);
  assert.equal(demands[2].requiredKg, 1.7);
  assert.equal(Number((demands[0].requiredKg + demands[1].requiredKg + demands[2].requiredKg).toFixed(2)), 42.5);
});

test('una ficha admite varios PTI de racks distintos y bloquea un PTI ajeno a la ficha', () => {
  const bom = {
    id: 22,
    code: 'TEL-65-OZ',
    name: 'Tela 6.5 oz',
    items: [
      { pti_product_id: 101, role: 'URDIMBRE' },
      { pti_product_id: 102, role: 'TRAMA' },
      { pti_product_id: 101, role: 'REFUERZO' },
    ],
  };

  assert.deepEqual(getBomPtiProductIds(bom), [101, 102]);
  assert.equal(assertPtiIncludedInBom(101, bom), true);
  assert.equal(assertPtiIncludedInBom(102, bom), true);
  assert.throws(
    () => assertPtiIncludedInBom(103, bom),
    (error) => error.statusCode === 409 && error.code === 'PTI_NOT_IN_SELECTED_BOM',
  );
});

test('loadLoomCreel rechaza antes de mover saldos un rack cuyo PTI no pertenece a la ficha seleccionada', async () => {
  const originals = {
    transaction: models.sequelize.transaction,
    loomFindByPk: models.Loom.findByPk,
    rackFindByPk: models.PtiRack.findByPk,
    runFindOne: models.LoomRun.findOne,
    bomFindByPk: models.ProductionBom.findByPk,
    transferMode: telaresService.getPtiTransferMode,
    resolveSubarea: telaresService.resolvePtiSubareaId,
  };
  let rolledBack = false;
  const transaction = {
    LOCK: { UPDATE: 'UPDATE' },
    commit: async () => {},
    rollback: async () => { rolledBack = true; },
  };
  models.sequelize.transaction = async () => transaction;
  telaresService.getPtiTransferMode = async () => 'RACK_PARTIAL';
  telaresService.resolvePtiSubareaId = async () => 3;
  models.Loom.findByPk = async () => ({
    id: 7,
    name: 'Telar Circular 07',
    subarea_id: 3,
    supported_pti_types: [203],
    supported_bom_ids: [22],
    current_spools_count: 0,
    creel_capacity_spools: 1800,
  });
  models.PtiRack.findByPk = async () => ({
    id: 9,
    rack_code: 'RACK-TEST-09',
    qr_code: 'QR-RACK-TEST-09',
    current_quantity: 5,
    current_pti_product_id: 203,
    destination_subarea_id: 3,
    destination_route: null,
    custody_shift_session_id: null,
    container_type: 'RACK',
    currentPtiProduct: { id: 203, code: 'PTI-203', telares_subarea_code: 'TELARES_ROLLO', unit_weight_kg: 5 },
  });
  models.LoomRun.findOne = async () => null;
  models.ProductionBom.findByPk = async () => ({
    id: 22,
    code: 'TEL-TEST-22',
    name: 'Ficha de prueba',
    is_active: true,
    is_provisional: false,
    subarea_id: 3,
    items: [{ pti_product_id: 201, role: 'URDIMBRE' }, { pti_product_id: 202, role: 'TRAMA' }],
  });

  try {
    await assert.rejects(
      telaresService.loadLoomCreel({
        loom_id: 7,
        rack_id: 9,
        spools_to_load: 1,
        scanned_qr: 'QR-RACK-TEST-09',
        bom_id: 22,
      }),
      (error) => error.statusCode === 409 && error.code === 'PTI_NOT_IN_SELECTED_BOM',
    );
    assert.equal(rolledBack, true, 'el movimiento debe cancelarse atómicamente');
  } finally {
    models.sequelize.transaction = originals.transaction;
    models.Loom.findByPk = originals.loomFindByPk;
    models.PtiRack.findByPk = originals.rackFindByPk;
    models.LoomRun.findOne = originals.runFindOne;
    models.ProductionBom.findByPk = originals.bomFindByPk;
    telaresService.getPtiTransferMode = originals.transferMode;
    telaresService.resolvePtiSubareaId = originals.resolveSubarea;
  }
});

test('la cobertura separa PTI por ficha y sugiere el rack del componente faltante', async () => {
  const originals = {
    wipFindAll: models.LoomPtiWip.findAll,
    rackFindAll: models.PtiRack.findAll,
    transferMode: telaresService.getPtiTransferMode,
  };
  let wipRows = [{ pti_product_id: 201, quantity_remaining_spools: 2, unit_weight_kg: 5 }];
  let rackRows = [
    { rack_code: 'RACK-URD', qr_code: 'QR-URD', current_pti_product_id: 201, current_quantity: 2, unit_weight_kg: 5, destination_route: 'TELARES_ROLLO', currentPtiProduct: { id: 201, code: 'PTI-URD', telares_subarea_code: 'TELARES_ROLLO' } },
    { rack_code: 'RACK-TRA', qr_code: 'QR-TRA', current_pti_product_id: 202, current_quantity: 2, unit_weight_kg: 5, destination_route: 'TELARES_ROLLO', currentPtiProduct: { id: 202, code: 'PTI-TRA', telares_subarea_code: 'TELARES_ROLLO' } },
    { rack_code: 'RACK-TRA-LOCKED', qr_code: 'QR-TRA-LOCKED', current_pti_product_id: 202, current_quantity: 1, unit_weight_kg: 20, destination_route: 'TELARES_ROLLO', custody_shift_session_id: 44, currentPtiProduct: { id: 202, code: 'PTI-TRA', telares_subarea_code: 'TELARES_ROLLO' } },
  ];
  models.LoomPtiWip.findAll = async () => wipRows;
  models.PtiRack.findAll = async () => rackRows;
  telaresService.getPtiTransferMode = async () => 'RACK_PARTIAL';

  try {
    const bom = {
      code: 'TEL-MIX-PTI',
      is_provisional: false,
      standard_output_meters: 10,
      expected_output_quantity: 1,
      expected_output_unit: 'ROLLO',
      items: [
        { pti_product_id: 201, role: 'URDIMBRE', consumption_per_meter: 1, consumption_per_meter_unit: 'KG', ptiProduct: { id: 201, code: 'PTI-URD', unit_weight_kg: 5 } },
        { pti_product_id: 202, role: 'TRAMA', consumption_per_meter: 1, consumption_per_meter_unit: 'KG', ptiProduct: { id: 202, code: 'PTI-TRA', unit_weight_kg: 5 } },
      ],
    };

    const partial = await telaresService.assessLoomPtiAvailability({ loomId: 8, bom, plannedMeters: 10 });
    assert.equal(partial.sufficient, false);
    assert.deepEqual(partial.shortages.map((row) => row.pti_product_id), [201, 202]);
    assert.deepEqual(partial.shortages.map((row) => row.deficit_kg), [0, 10]);
    assert.equal(partial.shortages[1].deficit_spools, 2, 'la estimación debe usar solo bobinas de racks liberados');
    assert.equal(partial.shortages[1].fifo_racks[0].rack_code, 'RACK-TRA');
    assert.equal(partial.shortages[1].fifo_racks.some((rack) => rack.rack_code === 'RACK-TRA-LOCKED'), false, 'un rack en custodia no debe sugerirse para Telares');

    wipRows = [...wipRows, { pti_product_id: 202, quantity_remaining_spools: 2, unit_weight_kg: 5 }];
    const sufficient = await telaresService.assessLoomPtiAvailability({ loomId: 8, bom, plannedMeters: 10 });
    assert.equal(sufficient.sufficient, true);
    assert.deepEqual(sufficient.shortages.map((row) => row.deficit_kg), [0, 0]);
  } finally {
    models.LoomPtiWip.findAll = originals.wipFindAll;
    models.PtiRack.findAll = originals.rackFindAll;
    telaresService.getPtiTransferMode = originals.transferMode;
  }
});

test('las fichas provisionales no permiten calcular ni consumir WIP para producción', () => {
  assert.throws(
    () => telaresService.calculateBomPtiDemand({
      code: 'BOM-PENDIENTE',
      is_provisional: true,
      items: [{ pti_product_id: 1, consumption_g_per_m: 20 }],
    }, 80),
    (error) => error.code === 'BOM_PROVISIONAL_NOT_PRODUCTION_READY' && error.statusCode === 409,
  );
});

test('si se capturan pesos por operador, los rangos deben cubrir el total sin huecos ni traslapes', () => {
  assert.equal(validateOperatorWeightCoverage([
    { weight_start_kg: 0, weight_end_kg: 50 },
    { weight_start_kg: 50, weight_end_kg: 100 },
  ], 100), true);
  assert.throws(
    () => validateOperatorWeightCoverage([
      { weight_start_kg: 0, weight_end_kg: 45 },
      { weight_start_kg: 50, weight_end_kg: 100 },
    ], 100),
    (error) => error.code === 'OPERATOR_WEIGHT_GAP',
  );
});

test('cada salida de Telares requiere metros y peso reales capturados', () => {
  assert.deepEqual(validateOutputMeasures(80, 42.5), { meters: 80, weight_kg: 42.5 });
  assert.throws(() => validateOutputMeasures('', 42.5), (error) => error.code === 'OUTPUT_METERS_REQUIRED');
  assert.throws(() => validateOutputMeasures(80, ''), (error) => error.code === 'OUTPUT_WEIGHT_REQUIRED');
});

test('saveBom rechaza Denier 1800 en telas de 6.5 a 8.0 oz y rechaza cinta de identificación en tela PLANA', async () => {
  const prevTransaction = models.sequelize.transaction;
  models.sequelize.transaction = async () => ({
    LOCK: { UPDATE: 'UPDATE' },
    commit: async () => {},
    rollback: async () => {},
  });

  try {
    await assert.rejects(
      telaresService.saveBom({
        code: 'BOM-TEST-65-1800',
        name: 'Tela 6.5 oz con Denier 1800 inválido',
        product_kind: 'ROLLO_TELA',
        ounces_yd2: 6.5,
        fabric_type: 'TUBULAR',
        tape_color: 'ROJO',
        weft_denier: '1800',
        warp_denier: '2000',
        is_provisional: true,
        default_route: ['TELARES', 'CORTE'],
      }),
      /Para telas de 6\.5 oz a 8\.0 oz NO se puede emplear TRAMA de denier 1800/i
    );

    await assert.rejects(
      telaresService.saveBom({
        code: 'BOM-TEST-50-PLANA-CINTA',
        name: 'Tela Plana con Cinta Inválida',
        product_kind: 'ROLLO_TELA',
        ounces_yd2: 5.0,
        fabric_type: 'PLANA',
        tape_color: 'ROJO',
        weft_denier: '2000',
        warp_denier: '2000',
        is_provisional: true,
        default_route: ['TELARES', 'CORTE'],
      }),
      /Todas las telas planas NO llevan cinta de identificación/i
    );
  } finally {
    models.sequelize.transaction = prevTransaction;
  }
});

test('finishLoomRun cierra una corrida activa EN_PROCESO y libera el telar a DISPONIBLE', async () => {
  const prevTransaction = models.sequelize.transaction;
  const prevFindRun = models.LoomRun.findByPk;
  const prevFindLoom = models.Loom.findByPk;

  let runUpdatedWith = null;
  let loomUpdatedWith = null;

  models.sequelize.transaction = async () => ({
    LOCK: { UPDATE: 'UPDATE' },
    commit: async () => {},
    rollback: async () => {},
  });
  models.LoomRun.findByPk = async () => ({
    id: 55,
    folio: 'RUN-TEL-20261031-0001',
    loom_id: 10,
    bom_id: 3,
    status: 'EN_PROCESO',
    meters_planned: 1500,
    meters_produced: 1000,
    total_weight_produced_kg: 70,
    rolls_produced_count: 2,
    notes: 'Corrida inicial',
    loom: { id: 10, name: 'Telar Circular 10' },
    update: async function (vals) {
      runUpdatedWith = vals;
      Object.assign(this, vals);
    },
  });
  models.Loom.findByPk = async () => ({
    id: 10,
    name: 'Telar Circular 10',
    status: 'EN_PRODUCCION',
    current_spools_count: 1200,
    current_wip_kg: 240,
    update: async function (vals) {
      loomUpdatedWith = vals;
      Object.assign(this, vals);
    },
  });

  try {
    const result = await telaresService.finishLoomRun({
      run_id: 55,
      operator_id: 1,
      notes: 'Cambio de orden',
    });

    assert.equal(result.success, true);
    assert.equal(runUpdatedWith.status, 'FINALIZADA');
    assert.ok(runUpdatedWith.finished_at instanceof Date);
    assert.match(runUpdatedWith.notes, /Cambio de orden/);
    assert.deepEqual(loomUpdatedWith, { status: 'DISPONIBLE' });
  } finally {
    models.sequelize.transaction = prevTransaction;
    models.LoomRun.findByPk = prevFindRun;
    models.Loom.findByPk = prevFindLoom;
  }
});
