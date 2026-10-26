'use strict';

// Explicitly restricted to a disposable local clone. Example:
// $env:DB_NAME='telares_integrity_test'; $env:TELARES_TEST_DATABASE='telares_integrity_test'; node src/scripts/test-warehouse-to-telares-integrity.js
const env = require('../config/env');
const db = require('../database/models');
const warehouseService = require('../modules/warehouse/consumptionOrder.service');
const extrusionService = require('../modules/extrusion/extrusion.service');
const telaresService = require('../modules/telares/telares.service');

function assert(condition, message) {
  if (!condition) throw new Error(`INTEGRITY ASSERTION FAILED: ${message}`);
}

function activeUserFor(roleCode) {
  return db.User.findOne({
    where: { is_active: true },
    include: [{ model: db.Role, as: 'role', where: { code: roleCode }, required: true }],
    order: [['id', 'ASC']],
  });
}

async function testRuleBoundaries() {
  assert(env.nodeEnv !== 'production', 'no se permiten pruebas de producción');
  assert(env.db.host === '127.0.0.1' || env.db.host === 'localhost', 'la BD debe ser local');
  assert(process.env.TELARES_TEST_DATABASE, 'define TELARES_TEST_DATABASE con el nombre exacto de la copia local');
  assert(env.db.name === process.env.TELARES_TEST_DATABASE, 'DB_NAME no coincide con TELARES_TEST_DATABASE');
  assert(/test/i.test(env.db.name), 'el nombre de BD debe indicar que es una base de prueba');

  for (const route of [null, [], ['GLOBO', 'CORTE'], ['TELARES'], ['TELARES', 'globo', 'GLOBO'], ['TELARES', 'UNKNOWN']]) {
    let rejected = false;
    try { telaresService.normalizeProductionRoute(route); } catch (error) { rejected = error.code === 'INVALID_PRODUCTION_ROUTE'; }
    assert(rejected, `la ruta inválida ${JSON.stringify(route)} debe rechazarse`);
  }
  assert(
    JSON.stringify(telaresService.normalizeProductionRoute(['Telares', 'Globo', 'Corte'])) === JSON.stringify(['TELARES', 'GLOBO', 'CORTE']),
    'la ruta válida debe normalizarse'
  );

  const pti1800 = await db.PtiProduct.findOne({ where: { is_active: true, denier: 1800 } });
  assert(pti1800, 'hace falta un PTI activo de denier 1800 para probar los límites de la especificación');
  const base = {
    code: `QA-TELAR-${Date.now()}`,
    name: 'QA límite de restricción de denier',
    default_route: ['TELARES', 'CORTE'],
    target_width_cm: 50,
    target_weight_g_per_m: 65,
    items: [{ pti_product_id: pti1800.id, role: 'TRAMA', ratio_percentage: 100, consumption_g_per_m: 65, required_quantity: 1, required_unit: 'KG' }],
  };
  const bomAboveRange = await telaresService.saveBom({ ...base, code: `${base.code}-ABOVE`, ounces_yd2: 8.5, weft_denier: '1800', warp_denier: '2000' });
  try {
    assert(Number(bomAboveRange.ounces_yd2) === 8.5, 'un tejido mayor a 8.0 oz no debe heredar la restricción limitada a 6.5–8.0 oz');
  } finally {
    await db.ProductionBomItem.destroy({ where: { bom_id: bomAboveRange.id } });
    await db.ProductionBom.destroy({ where: { id: bomAboveRange.id } });
  }
  let boundaryRejected = false;
  try {
    await telaresService.saveBom({ ...base, code: `${base.code}-BOUNDARY`, ounces_yd2: 8.0, weft_denier: '2000', warp_denier: '1800' });
  } catch (error) {
    boundaryRejected = /6\.5 oz a 8\.0 oz/.test(error.message);
  }
  assert(boundaryRejected, '8.0 oz con denier 1800 debe rechazarse en el límite superior');
  console.log('PASS reglas de ruta y límites 6.5–8.0 oz');
}

async function testWarehouseToTelares() {
  const [extrusionArea, telaresArea] = await Promise.all([
    db.Area.findOne({ where: { code: 'EXTRUSION' } }),
    db.Area.findOne({ where: { code: 'TELARES' } }),
  ]);
  assert(extrusionArea && telaresArea, 'faltan las áreas Extrusión o Telares');

  const [requester, warehouseman, extrusionSupervisor, operator, supervisor] = await Promise.all([
    activeUserFor('SUPERVISOR_EXTRUSION'),
    activeUserFor('WAREHOUSEMAN'),
    activeUserFor('SUPERVISOR_EXTRUSION'),
    activeUserFor('OPERADOR_TELARES'),
    activeUserFor('SUPERVISOR_TELARES'),
  ]);
  assert(requester && warehouseman && extrusionSupervisor && operator && supervisor, 'faltan usuarios activos de prueba por rol');

  const formula = await db.Formula.findOne({
    where: { code: 'F-EXT-4-BLANCA', is_active: true },
    include: [{ model: db.FormulaIngredient, as: 'ingredients', include: [{ model: db.Material, as: 'material' }] }],
  });
  assert(formula?.ingredients?.length, 'no se encontró la fórmula blanca de Extrusora 4 y sus componentes');
  // Resolve every fixed fixture before creating orders or consuming QA inventory.
  const bom = await db.ProductionBom.findByPk(14);
  assert(bom?.is_active, 'no se encontró el BOM QA activo (ID 14)');
  const rack = await db.PtiRack.findOne({ where: { rack_code: 'DEMO-EXT-RACK-01' } });
  assert(rack && Number(rack.current_quantity) === 0, 'se requiere el rack local DEMO-EXT-RACK-01 vacío');
  const looms = await db.Loom.findAll({
    where: { is_active: true },
    include: [{ model: db.LoomRun, as: 'runs', where: { status: 'EN_PROCESO' }, required: false }],
    order: [['code', 'ASC']],
  });
  const loom = looms.find((candidate) =>
    !candidate.runs?.length &&
    Number(candidate.current_spools_count) === 0 &&
    Number(candidate.current_wip_kg) === 0 &&
    (!Array.isArray(candidate.supported_bom_ids) || !candidate.supported_bom_ids.length || candidate.supported_bom_ids.map(Number).includes(Number(bom.id)))
  );
  assert(loom, 'no hay telar activo, compatible y sin corrida ni WIP para QA');
  const materials = formula.ingredients.map((ingredient) => ({
    material_id: Number(ingredient.material_id),
    quantity: Number(ingredient.quantity),
  }));
  const order = await warehouseService.createOrder({
    requested_by: requester.id,
    requesting_area_id: extrusionArea.id,
    items: materials,
    notes: 'Prueba de integridad local Almacén a Extrusión a Telares',
  });
  await warehouseService.updateOrderStatus(order.uuid, 'PREPARANDO', warehouseman.id);

  const allocatedItems = await db.ConsumptionOrderItem.findAll({
    where: { order_id: order.id },
    include: [{ model: db.Lote, as: 'lote', include: [{ model: db.QrCode, as: 'qr_code' }] }],
    order: [['id', 'ASC']],
  });
  const sourceLots = [];
  for (const item of allocatedItems) {
    assert(item.lote?.qr_code?.qr_code, `la asignación del material ${item.material_id} no tiene QR padre para surtir`);
    sourceLots.push({
      lotId: item.lote.id,
      materialId: item.material_id,
      parentQr: item.lote.qr_code.qr_code,
      quantity: Number(item.requested_quantity),
    });
    await warehouseService.scanFulfillmentItem(order.uuid, item.lote.qr_code.qr_code, warehouseman.id);
  }
  const fulfilledItems = await db.ConsumptionOrderItem.findAll({
    where: { order_id: order.id },
    include: [{ model: db.QrCode, as: 'child_qr' }],
    order: [['id', 'ASC']],
  });
  for (const item of fulfilledItems) {
    assert(Number(item.fulfilled_quantity) + 0.0005 >= Number(item.requested_quantity), `ODC ${order.order_number} dejó sin surtir material ${item.material_id}`);
    assert(item.child_qr_id && item.child_qr?.status === 'IN_WIP', `la materia prima ${item.material_id} no recibió QR hijo activo en WIP`);
  }
  const mixInputs = fulfilledItems.map((item) => ({
    material_id: item.material_id,
    qr_code: item.child_qr.qr_code,
    quantity: Number(item.fulfilled_quantity),
  }));
  const preparationQr = `QA-MIX-TELARES-${Date.now()}`;
  const preparation = await extrusionService.mixFormula({
    formula_id: formula.id,
    extruder_id: 4,
    destination_qr_code: preparationQr,
    inputs: mixInputs,
    silo_inputs: [],
    area_id: extrusionArea.id,
    notes: 'Dosificación manual QA desde WIP de Almacén',
  }, extrusionSupervisor.id);
  assert(Math.abs(Number(preparation.total_quantity) - 500) <= 0.05, `la mezcla manual debe conciliar 500 kg; recibió ${preparation.total_quantity}`);
  for (const source of sourceLots) {
    const child = fulfilledItems.find((item) => item.material_id === source.materialId && item.lote_id === source.lotId)?.child_qr;
    assert(child, `no se halló la etiqueta WIP hija del lote ${source.lotId}`);
    const wip = await db.WipInventory.findOne({ where: { qr_code_id: child.id, area_id: extrusionArea.id } });
    assert(wip && Number(wip.amount) <= 0.001, `el WIP del lote ${source.lotId} no disminuyó después de la dosificación`);
  }

  // mixFormula encola automáticamente cuando se especifica extruder_id.
  const queue = await db.ExtruderQueue.findOne({ where: { consumption_order_qr_id: preparationQr } });
  assert(queue && Number(queue.extruder_id) === 4, 'la mezcla no creó automáticamente su entrada en la cola de Extrusora 4');
  const activation = await extrusionService.switchQueuePriority({
    extruder_id: 4,
    target_queue_id: queue.id,
    userId: extrusionSupervisor.id,
    notes: 'Activación de lote QA',
  });
  assert(activation.active_queue?.status === 'ACTIVA', 'la mezcla no pasó a ACTIVA en Extrusora 4');

  const pti = await db.PtiProduct.findByPk(formula.output_pti_id);
  assert(pti?.is_active && Number(pti.id) === 68, 'falta el PTI activo asociado a la fórmula de salida');
  const production = await extrusionService.scanRackPti({
    rack_qr: rack.qr_code,
    pti_material_id: pti.id,
    quantity: 100,
    unit_weight_kg: 5,
    mixture_qr: preparationQr,
    notes: 'Producción de 100 bobinas QA (500 kg) para Telares',
    userId: extrusionSupervisor.id,
  });
  assert(Number(production.rack.current_quantity) === 100, 'el rack PTI no recibió las 100 bobinas');
  assert(Math.abs(Number(production.rack.current_quantity) * 5 - 500) < 0.01, 'el peso neto del rack no concilia con la mezcla');

  const beforeRackQty = Number((await db.PtiRack.findByPk(rack.id)).current_quantity);
  const transfer = await telaresService.loadLoomCreel({ loom_id: loom.id, rack_id: rack.id, spools_to_load: 1, operator_id: operator.id });
  assert(transfer.success && transfer.rack.current_quantity === beforeRackQty - 1, 'la transferencia no descontó 1 bobina del rack');
  const trackedWip = await db.LoomPtiWip.findOne({ where: { loom_id: loom.id, pti_product_id: pti.id, source_rack_id: rack.id }, order: [['id', 'DESC']] });
  assert(trackedWip && Number(trackedWip.quantity_remaining_spools) === 1, 'el PTI no apareció en el WIP trazable individual del telar');
  assert(Math.abs(Number((await db.Loom.findByPk(loom.id)).current_wip_kg) - 5) < 0.001, 'el saldo agregado del telar no concilia con 1 bobina de 5 kg');

  const startAttempts = await Promise.allSettled([
    telaresService.startLoomRun({ loom_id: loom.id, bom_id: bom.id, operator_id: operator.id, shift: 'TURNO_1', meters_planned: 50, notes: 'Carrera concurrente QA A' }),
    telaresService.startLoomRun({ loom_id: loom.id, bom_id: bom.id, operator_id: operator.id, shift: 'TURNO_1', meters_planned: 50, notes: 'Carrera concurrente QA B' }),
  ]);
  const started = startAttempts.filter((result) => result.status === 'fulfilled');
  const rejected = startAttempts.filter((result) => result.status === 'rejected');
  assert(started.length === 1 && rejected.length === 1, 'dos transacciones concurrentes no deben iniciar dos corridas en el mismo telar');
  const run = started[0].value;
  const finish = await telaresService.finishRollAndBackflush({
    run_id: run.id,
    meters: 50,
    weight_kg: 5,
    operator_id: operator.id,
    recorded_by: supervisor.id,
    shift_supervisor_id: supervisor.id,
    shift_number: 1,
    operator_segments: [{ operator_id: operator.id, shift_number: 1, meters_start: 0, meters_end: 50, weight_start_kg: 0, weight_end_kg: 5 }],
    notes: 'Rollo de 50 m para validación integral local',
  });
  assert(finish.backflush.length > 0 && Number(finish.backflush.reduce((sum, row) => sum + Number(row.spools_consumed), 0)) === 1, 'el backflush no consumió exactamente 1 bobina');
  const afterWip = await db.LoomPtiWip.findByPk(trackedWip.id);
  const afterLoom = await db.Loom.findByPk(loom.id);
  assert(Number(afterWip.quantity_remaining_spools) === 0, 'el ledger WIP del telar no se descontó');
  assert(Number(afterLoom.current_spools_count) === 0 && Number(afterLoom.current_wip_kg) === 0, 'los saldos agregados del telar no se reconciliaron tras el backflush');

  const invalidScan = await telaresService.validateViajeroScan({ qr_code: finish.roll.qr_code, area_name: 'ALMACEN', operator_id: operator.id });
  assert(invalidScan.is_allowed === false && invalidScan.error_code === 'AREA_NOT_IN_ROUTE', 'el rollo debe bloquearse fuera de su ruta');
  const outOfOrder = await telaresService.validateViajeroScan({ qr_code: finish.roll.qr_code, area_name: 'LAMINADO', operator_id: operator.id });
  assert(outOfOrder.is_allowed === false && outOfOrder.error_code === 'OUT_OF_SEQUENCE', 'el rollo debe bloquear el salto de GLOBO');
  const noArea = await telaresService.validateViajeroScan({ qr_code: finish.roll.qr_code, area_name: '', operator_id: operator.id });
  assert(noArea.is_allowed === false && noArea.error_code === 'AREA_REQUIRED', 'el endpoint debe responder de forma controlada si falta el área');

  const stageAttempts = await Promise.allSettled([
    telaresService.processViajeroStage({ qr_code: finish.roll.qr_code, target_stage: 'GLOBO', operator_id: operator.id, notes: 'Proceso de ruta QA A' }),
    telaresService.processViajeroStage({ qr_code: finish.roll.qr_code, target_stage: 'GLOBO', operator_id: operator.id, notes: 'Proceso de ruta QA B' }),
  ]);
  assert(stageAttempts.filter((result) => result.status === 'fulfilled').length === 1, 'un QR de rollo no debe avanzar dos veces en paralelo');
  assert(stageAttempts.filter((result) => result.status === 'rejected').length === 1, 'el segundo avance simultáneo debe bloquearse');
  const rollDetail = await telaresService.getViajeroDetails(finish.roll.qr_code, supervisor);
  assert(rollDetail?.genealogy_tree?.exact_source_entries, 'el rollo viajero debe conservar entradas exactas de Extrusión');
  assert(rollDetail.genealogy_tree.raw_materials.length === formula.ingredients.length, 'la genealogía del rollo debe llegar a todos los materiales de la mezcla');
  assert(rollDetail.current_stage === 'GLOBO' && rollDetail.next_allowed_stage === 'LAMINADO', 'el QR viajero no avanzó correctamente por su ruta');

  const movementCount = await db.InventoryMovement.count({ where: { consumption_order_id: order.id } });
  assert(movementCount === fulfilledItems.length, 'la ODC no dejó un movimiento de almacén por asignación surtida');
  console.log(JSON.stringify({
    database: env.db.name,
    order: order.order_number,
    raw_material_lines: fulfilledItems.length,
    formula: formula.code,
    mixture_kg: Number(preparation.total_quantity),
    extrusion_rack: rack.rack_code,
    pti_spools_produced: production.rack.current_quantity,
    loom: loom.code,
    bobbins_to_loom: 1,
    roll_qr: finish.roll.qr_code,
    roll_meters: Number(finish.roll.meters),
    exact_source_entries: rollDetail.genealogy_tree.source_entry_count,
    raw_material_genealogy_items: rollDetail.genealogy_tree.raw_materials.length,
    next_stage: rollDetail.next_allowed_stage,
  }, null, 2));
  console.log('PASS flujo Almacén → Extrusión → PTI → Telares → Rollo Viajero');
}

async function run() {
  try {
    await db.sequelize.authenticate();
    await testRuleBoundaries();
    await testWarehouseToTelares();
  } catch (error) {
    console.error(error.stack || error);
    process.exitCode = 1;
  } finally {
    await db.sequelize.close();
  }
}

run();
