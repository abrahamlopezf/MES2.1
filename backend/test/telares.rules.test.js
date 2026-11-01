'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const models = require('../src/database/models');
const telaresService = require('../src/modules/telares/telares.service');
const { validateOperatorWeightCoverage, validateOutputMeasures } = require('../src/modules/telares/productionRules');

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
