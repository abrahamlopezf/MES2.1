'use strict';

const {
  sequelize,
  User,
  Material,
  Lote,
  Inventory,
  QrCode,
  QrBatch,
  ConsumptionOrder,
  ConsumptionOrderItem,
  WipInventory,
  Formula,
  ProcessFormula,
  ProcessPreparation,
  PtiRack,
  ExtruderQueue,
  ExtrusionScrapLog,
  Area,
  Location,
} = require('../database/models');

const inventoryDomainService = require('../modules/warehouse/inventoryDomain.service');
const consumptionOrderService = require('../modules/warehouse/consumptionOrder.service');
const extrusionService = require('../modules/extrusion/extrusion.service');

async function runFullLineExtrusionTest() {
  console.log('===============================================================');
  console.log('🧪 PRUEBA MANUAL / INTEGRAL DE TODA LA LÍNEA: ALMACÉN -> EXTRUSIÓN');
  console.log('===============================================================');

  // 0. Obtener usuario de prueba (Superadmin / Operador)
  const user = await User.findOne({ where: { is_active: true } });
  if (!user) throw new Error('No se encontró ningún usuario activo para la prueba.');
  const userId = user.id;
  console.log(`👤 Usuario de prueba: ${user.username} (ID: ${userId})`);

  // Asegurar lote de QRs de prueba
  let batch = await QrBatch.findOne();
  if (!batch) {
    batch = await QrBatch.create({
      code: 'BATCH-TEST-001',
      total_codes: 100,
      prefix: 'QR',
      status: 'ACTIVE',
      created_by: userId,
    });
  }

  // Función helper para obtener o crear un QR virgen
  const getVirginQr = async (prefix = 'QR-TEST') => {
    const num = Math.floor(Math.random() * 100000);
    const code = `${prefix}-${Date.now()}-${num}`;
    const serial = Math.floor(Date.now() / 1000) * 100000 + num;
    return await QrCode.create({
      batch_id: batch.id,
      qr_code: code,
      code,
      serial,
      status: 'GENERATED',
      is_active: true,
      current_area_id: 1, // Almacén
      created_by: userId,
    });
  };

  // 1. VERIFICAR MATERIALES DE FÓRMULA BLANCA EXTRUSORA 4
  console.log('\n--- PASO 1: Identificar Materiales del Catálogo de Almacén ---');
  const formula4 = await Formula.findOne({
    where: { code: 'F-EXT-4-BLANCA', is_active: true },
    include: [{ model: require('../database/models').FormulaIngredient, as: 'ingredients', include: [{ model: Material, as: 'material' }] }],
  });
  if (!formula4?.ingredients?.length || !formula4.output_pti_id) {
    throw new Error('La fórmula activa F-EXT-4-BLANCA debe incluir ingredientes y un PTI de salida.');
  }
  const materialForIngredient = (name) => formula4.ingredients.find((item) => item.material?.name === name)?.material;
  const matPpa = materialForIngredient('POLIPROPILENO (A)');
  const matCarb = materialForIngredient('CARBONATO DE CALCIO');
  const matMbBco = materialForIngredient('MASTERBATCH BLANCO');
  const matUv = materialForIngredient('CONCENTRADO UVPP20');
  const matPpb = await Material.findOne({ where: { name: 'POLIPROPILENO (B)' } });

  if (!matPpa || !matCarb || !matMbBco || !matUv) {
    throw new Error('Faltan materiales clave en el catálogo de almacén.');
  }

  console.log(`  ✓ POLIPROPILENO (A): ID ${matPpa.id}`);
  console.log(`  ✓ CARBONATO DE CALCIO: ID ${matCarb.id}`);
  console.log(`  ✓ MASTERBATCH BLANCO: ID ${matMbBco.id}`);
  console.log(`  ✓ CONCENTRADO UVPP20: ID ${matUv.id}`);

  // 2. RECEPCIÓN EN ALMACÉN (SIMULANDO TAMBIÉN EL ALMACÉN 2)
  console.log('\n--- PASO 2: Recepción de Lotes en Almacén ---');
  
  // Ubicación Almacén 2 vs Almacén 1
  const locAlm2 = await Location.findOne({ where: { code: 'ALM2-GENERAL' } });
  const locAlm1 = await Location.findOne({ where: { code: 'A1' } });

  // Recibir PP-A en Almacén 1 (1,000 kg)
  const qrPpa = await getVirginQr('QR-LOT-PPA');
  const recPpa = await inventoryDomainService.receiveLote({
    material_id: matPpa.id,
    user_id: userId,
    qr_id: qrPpa.id,
    location_id: locAlm1?.id || 1,
    quantity: 1000.00,
    folio: `LOT-PPA-${Date.now().toString().slice(-5)}`,
    notes: 'Recepción directa en Almacén Principal',
  });
  console.log(`  ✓ Lote PP-A recibido: Folio ${recPpa.lote.folio}, QR: ${qrPpa.qr_code}, Cantidad: 1000 kg en Almacén 1`);

  // Recibir Carbonato en Almacén 1 (100 kg)
  const qrCarb = await getVirginQr('QR-LOT-CARB');
  const recCarb = await inventoryDomainService.receiveLote({
    material_id: matCarb.id,
    user_id: userId,
    qr_id: qrCarb.id,
    location_id: locAlm1?.id || 1,
    quantity: 100.00,
    folio: `LOT-CARB-${Date.now().toString().slice(-5)}`,
    notes: 'Recepción en Almacén Principal',
  });
  console.log(`  ✓ Lote Carbonato recibido: Folio ${recCarb.lote.folio}, QR: ${qrCarb.qr_code}, Cantidad: 100 kg`);

  // Recibir Masterbatch Blanco en Almacén 2 (Unidad Externa) y transferir a Almacén 1 (50 kg)
  const qrMbBco = await getVirginQr('QR-LOT-MB-BCO');
  const recMbBco = await inventoryDomainService.receiveLote({
    material_id: matMbBco.id,
    user_id: userId,
    qr_id: qrMbBco.id,
    location_id: locAlm2?.id || locAlm1?.id || 1,
    quantity: 50.00,
    folio: `LOT-MB-BCO-${Date.now().toString().slice(-5)}`,
    notes: 'Ingreso inicial en Almacén 2 (Otra Unidad de Negocio) para surtido a planta',
  });
  console.log(`  ✓ Lote Masterbatch Blanco recibido en Almacén 2 (Unidad Externa): Folio ${recMbBco.lote.folio}, QR: ${qrMbBco.qr_code}, Cantidad: 50 kg`);

  // Traspaso de Almacén 2 a Almacén 1
  recMbBco.lote.location_id = locAlm1?.id || 1;
  recMbBco.lote.notes = `${recMbBco.lote.notes} | Transferido a Almacén Principal`;
  await recMbBco.lote.save();
  console.log(`  ✓ Lote Masterbatch Blanco transferido de Almacén 2 a Almacén 1 listo para suministro.`);

  // Recibir UV en Almacén 1 (50 kg)
  const qrUv = await getVirginQr('QR-LOT-UV');
  const recUv = await inventoryDomainService.receiveLote({
    material_id: matUv.id,
    user_id: userId,
    qr_id: qrUv.id,
    location_id: locAlm1?.id || 1,
    quantity: 50.00,
    folio: `LOT-UV-${Date.now().toString().slice(-5)}`,
    notes: 'Recepción en Almacén Principal',
  });
  console.log(`  ✓ Lote UV recibido: Folio ${recUv.lote.folio}, QR: ${qrUv.qr_code}, Cantidad: 50 kg`);

  // 3. GENERAR ORDEN DE CONSUMO DESDE EXTRUSIÓN
  console.log('\n--- PASO 3: Supervisor de Extrusión genera Orden de Consumo a Almacén ---');
  const order = await consumptionOrderService.createOrder({
    requested_by: userId,
    requesting_area_id: 2, // Extrusión
    notes: 'Materiales para Mezcla Blanca Extrusora 4 (500kg)',
    items: [
      { material_id: matPpa.id, quantity: 485.60 },
      { material_id: matCarb.id, quantity: 4.20 },
      { material_id: matMbBco.id, quantity: 6.00 },
      { material_id: matUv.id, quantity: 4.20 },
    ],
  });
  console.log(`  ✓ Orden de Consumo creada: ${order.order_number} (ID: ${order.id}, Total requerido: 500.00 kg)`);

  // 4. ALMACENISTA SUMINISTRA LA ORDEN ESCANEANDO QRs
  console.log('\n--- PASO 4: Almacenista surte escaneando los QRs de almacén hacia WIP Extrusión ---');
  
  // Cambiar estado a PREPARANDO
  await consumptionOrderService.updateOrderStatus(order.uuid, 'PREPARANDO', userId);
  // Surtir por escaneo el lote realmente reservado en cada renglón FIFO.
  // Una línea de fórmula puede dividirse entre varios lotes del mismo material.
  const allocatedItems = await ConsumptionOrderItem.findAll({
    where: { order_id: order.id },
    include: [{ model: Lote, as: 'lote', include: [{ model: QrCode, as: 'qr_code' }] }],
    order: [['id', 'ASC']],
  });
  for (const item of allocatedItems) {
    const lotQr = item.lote?.qr_code?.qr_code || item.lote?.folio;
    if (!lotQr) throw new Error(`El lote ${item.lote_id} de la ODC no tiene QR ni folio escaneable.`);
    await consumptionOrderService.scanFulfillmentItem(order.uuid, lotQr, userId);
    console.log(`  ✓ Surtido ${item.requested_quantity} kg del material ${item.material_id} escaneando ${lotQr}`);
  }

  // Verificar estado de la orden
  const completedOrder = await ConsumptionOrder.findByPk(order.id);
  console.log(`  ✓ Estado final de la Orden de Consumo: ${completedOrder.status}`);

  // Verificar que el material llegó al WIP de Extrusión
  const orderItems = await ConsumptionOrderItem.findAll({
    where: { order_id: order.id },
    include: [{ model: QrCode, as: 'child_qr' }],
    order: [['id', 'ASC']],
  });
  if (orderItems.some((item) => Number(item.fulfilled_quantity) + 0.0005 < Number(item.requested_quantity))) {
    throw new Error('La ODC quedó parcialmente surtida; no debe continuar a producción.');
  }
  const ppaOrderItem = orderItems.find((item) => Number(item.material_id) === Number(matPpa.id));
  const wipPpa = await WipInventory.findOne({ where: { qr_code_id: ppaOrderItem?.child_qr_id, area_id: 2 } });
  console.log(`  ✓ Inventario WIP Extrusión confirmado: PP-A disponible = ${wipPpa?.amount} kg`);
  if (!wipPpa || Math.abs(Number(wipPpa.amount) - 485.6) > 0.001) {
    throw new Error('El WIP de Extrusión debe contener exactamente los 485.60 kg surtidos, ligados al QR hijo del lote.');
  }

  // 5. CONTROL DE MEZCLA EN EXTRUSIÓN
  console.log('\n--- PASO 5: Control de Mezcla en Extrusión (Mix Control de 500 kg) ---');
  const mixDestQr = await getVirginQr('QR-MIX-BLANCA');

  const mixPayload = {
    formula_id: formula4.id,
    destination_qr_code: mixDestQr.qr_code,
    area_id: 2, // Extrusión
    notes: 'Control de mezcla 500kg para Extrusora 4',
    inputs: [
      ...orderItems.map((item) => ({ qr_code: item.child_qr?.qr_code, quantity: Number(item.fulfilled_quantity) })),
    ],
  };

  const preparation = await extrusionService.mixFormula(mixPayload, userId);
  console.log(`  ✓ Mezcla generada con éxito!`);
  console.log(`    - Folio Mezcla: ${preparation.folio}`);
  console.log(`    - QR Mezcla: ${mixDestQr.qr_code}`);
  console.log(`    - Peso Total Mezcla: ${preparation.total_quantity} kg`);
  console.log(`    - Estatus Mezcla: ${preparation.status}`);

  // 6. ENCOLADO EN EXTRUSORA Y VALIDACIÓN DE RESTRICCIÓN DE MÁQUINA
  console.log('\n--- PASO 6: Encolar Mezcla en Extrusoras y Validar Restricción de Extrusora 4 ---');

  // Test 6.1: Intentar encolar una fórmula prohibida con PP-B en Extrusora 4
  const formulaWithPpb = await Formula.findOne({ where: { code: 'F-EXT-1-BLANCO' } });
  let restrictionPassed = false;
  try {
    await extrusionService.enqueueMix({
      extruder_id: 4,
      consumption_order_qr_id: 'QR-TEST-PROHIBIDO',
      formula_id: formulaWithPpb.id,
      priority: 1
    });
  } catch (err) {
    if (err.message.includes('POLIPROPILENO (B)')) {
      restrictionPassed = true;
      console.log(`  ✓ [Seguridad Industrial Validada]: Se bloqueó correctamente el intento de meter PP-B en Extrusora 4.`);
    } else {
      console.error('  ❌ Error inesperado:', err.message);
    }
  }
  if (!restrictionPassed) {
    throw new Error('FALLO DE SEGURIDAD: La Extrusora 4 permitió una fórmula con PP-B.');
  }

  // Test 6.2: Encolar la mezcla autorizada F-EXT-4-BLANCA en Extrusora 4
  const formula4Floor = await Formula.findOne({ where: { code: 'F-EXT-4-BLANCA' } });
  const queueItem = await extrusionService.enqueueMix({
    extruder_id: 4,
    consumption_order_qr_id: mixDestQr.qr_code,
    formula_id: formula4Floor.id,
    priority: 5,
    notes: 'Prioridad alta - Mezcla 500kg Blanca'
  });
  console.log(`  ✓ Mezcla encolada en Extrusora 4: ID Cola #${queueItem.id}, Estatus: ${queueItem.status}`);
  const queueActivation = await extrusionService.switchQueuePriority({
    extruder_id: 4,
    target_queue_id: queueItem.id,
    scrap_items: [{
      category: 'MEZCLA_ANTERIOR',
      estimated_weight_kg: 3,
      reason: 'INTERRUPCION_QA',
      notes: 'Merma estimada de transición durante priorización de QA',
    }],
    userId,
    notes: 'Priorización con clasificación de merma de transición para QA integral',
  });
  if (queueActivation.active_queue?.status !== 'ACTIVA') {
    throw new Error('La mezcla de prueba debe activarse antes de registrar producción en rack PTI.');
  }

  // 7. TRANSFORMACIÓN EN CINTA / BOBINAS EN RACK PTI CON QR
  console.log('\n--- PASO 7: Transformación a Bobinas de Cinta y Asignación a Rack PTI con QR ---');
  
  // Buscar o crear Rack PTI
  const rackQr = await getVirginQr('QR-RACK-LINE');
  const outputPti = await require('../database/models').PtiProduct.findByPk(formula4.output_pti_id);
  const rack = await PtiRack.create({
    rack_code: `RACK-TEST-LINE-${Date.now()}`,
    qr_code: rackQr.qr_code,
    max_capacity: 100,
    current_quantity: 0,
    unit_weight_kg: Number(outputPti?.unit_weight_kg) || 5,
    status: 'VACIO',
    location_name: 'Piso Extrusión - Salida Ext 4'
  });

  // Inyectar 80 bobinas de cinta al Rack PTI escaneando su QR, registrando 15.00 kg de merma/scrap en el arranque
  const rackScanResult = await extrusionService.scanRackPti({
    rack_qr: rack.qr_code,
    pti_material_id: formula4.output_pti_id,
    quantity: 60,
    unit_weight_kg: Number(outputPti?.unit_weight_kg) || 5,
    mixture_qr: mixDestQr.qr_code,
    scrap_weight_kg: 15.00,
    scrap_reason: 'ARRANQUE_EXTRUSORA',
    notes: 'Llenado de 80 bobinas en Rack 1 + Scrap de arranque',
    userId
  });

  console.log(`  ✓ Bobinas de cinta ingresadas al contenedor PTI:`);
  console.log(`    - Rack: ${rackScanResult.rack.rack_code}`);
  console.log(`    - QR Rack: ${rackScanResult.rack.qr_code}`);
  console.log(`    - Cantidad en Rack: ${rackScanResult.rack.current_quantity} bobinas / piezas`);
  console.log(`    - Estatus Rack: ${rackScanResult.rack.status}`);
  console.log(`    - Backflushing Teórico: Consumo calculado = ${rackScanResult.backflushing?.total_raw_material_consumed_kg} kg`);

  // 8. REGISTRO DE MERMA / SCRAP Y BALANCE DE MASA (PULIDO 100%)
  console.log('\n--- PASO 8: Pulido de Scrap y Cálculo Backend de Balance de Masa ---');
  
  // Registrar otra merma operativa (ej. 10 kg por corte de orillas / trimming)
  const scrapResult = await extrusionService.registerOperationalScrap({
    extruder_id: 4,
    mixture_qr_id: mixDestQr.qr_code,
    scrap_weight_kg: 10.00,
    reason: 'CORTE_ORILLAS',
    notes: 'Desperdicio de orilla durante estiramiento de película',
    userId
  });
  console.log(`  ✓ Merma operativa adicional registrada: 10.00 kg (Razón: CORTE_ORILLAS)`);

  // Consultar Balance de Masa calculado por el backend
  const massBalance = await extrusionService.getMassBalance(mixDestQr.qr_code);
  console.log(`\n📊 BALANCE DE MASA CALCULADO POR BACKEND (Golden Rule #2 & #6):`);
  console.log(`  ┌───────────────────────────────────────────────────────────┐`);
  console.log(`  │ Masa Entrante (Batch Size):  ${massBalance.batch_size_kg.toFixed(2)} kg                  │`);
  console.log(`  │ Total Merma / Scrap:         ${massBalance.total_scrap_kg.toFixed(2)} kg                   │`);
  console.log(`  │ Porcentaje de Scrap:         ${massBalance.scrap_percentage.toFixed(2)} %                    │`);
  console.log(`  │ Producto Estimado Útil:      ${massBalance.estimated_useful_kg.toFixed(2)} kg                  │`);
  console.log(`  │ Rendimiento (Yield):         ${massBalance.estimated_yield_percentage.toFixed(2)} %                   │`);
  console.log(`  │ Estatus de Calidad / Merma:  ${massBalance.scrap_status}                       │`);
  console.log(`  └───────────────────────────────────────────────────────────┘`);

  console.log('\n===============================================================');
  console.log('✅ PRUEBA INTEGRAL COMPLETADA CON ÉXITO: 100% PULIDO Y FUNCIONAL');
  console.log('===============================================================');
}

runFullLineExtrusionTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error en la prueba:', err);
    process.exit(1);
  });
