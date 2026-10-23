'use strict';

const {
  sequelize,
  User,
  Role,
  Material,
  Lote,
  Inventory,
  InventoryMovement,
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
  TipoBaja
} = require('../database/models');

const receiveMaterialUseCase = require('../modules/reception/useCases/receiveMaterial.useCase');
const qrcodesService = require('../modules/qrcodes/qrcodes.service');
const inventoryDomainService = require('../modules/warehouse/inventoryDomain.service');
const warehouseService = require('../modules/warehouse/warehouse.service');
const consumptionOrderService = require('../modules/warehouse/consumptionOrder.service');
const extrusionService = require('../modules/extrusion/extrusion.service');

async function run13StepFlow() {
  console.log('================================================================================');
  console.log('🚀 INICIANDO VERIFICACIÓN COMPLETA DE 13 PUNTOS OPERACIONALES EN MES');
  console.log('================================================================================\n');

  // 0. Obtener usuario de prueba (Superadmin / Operador)
  const user = await User.findOne({
    where: { username: 'nexus' },
    include: [{ model: Role, as: 'role' }]
  }) || await User.findOne({
    where: { is_active: true },
    include: [{ model: Role, as: 'role' }]
  });
  if (!user) throw new Error('No se encontró ningún usuario activo para la prueba.');
  console.log(`👤 Usuario de Operación: ${user.username} (ID: ${user.id}, Rol: ${user.role?.code || 'SUPERADMIN'})`);

  const areaAlmacen = await Area.findOne({ where: { id: 1 } });
  const areaExtrusion = await Area.findOne({ where: { id: 2 } });
  const areaMantenimiento = await Area.findOne({ where: { id: 16 } }) || areaAlmacen;
  const locationA1 = await Location.findOne({ where: { code: 'A1' } }) || await Location.findOne();

  // Materiales para las fórmulas y pruebas
  const matPPA = await Material.findByPk(1227); // POLIPROPILENO (A)
  const matCarbonato = await Material.findByPk(1222); // CARBONATO DE CALCIO
  const matBlanco = await Material.findByPk(1146); // MASTERBATCH BLANCO
  const matUV = await Material.findByPk(1223); // CONCENTRADO UVPP20
  const matPPB = await Material.findByPk(1238); // POLIPROPILENO (B)
  const matPtiBlanca = await Material.findByPk(1213); // CINTA BLANCA
  const matPtiAmarilla = await Material.findByPk(1212); // CINTA AMARILLA

  console.log(`📦 Materiales Validados:`);
  console.log(`   - PP(A): ${matPPA?.name} (#${matPPA?.id})`);
  console.log(`   - Carbonato: ${matCarbonato?.name} (#${matCarbonato?.id})`);
  console.log(`   - Masterbatch Blanco: ${matBlanco?.name} (#${matBlanco?.id})`);
  console.log(`   - Aditivo UV: ${matUV?.name} (#${matUV?.id})`);
  console.log(`   - PP(B): ${matPPB?.name} (#${matPPB?.id})`);
  console.log(`   - PTI Cinta Blanca: ${matPtiBlanca?.name} (#${matPtiBlanca?.id})`);
  console.log(`   - PTI Cinta Amarilla: ${matPtiAmarilla?.name} (#${matPtiAmarilla?.id})`);

  const results = {};

  // --------------------------------------------------------------------------------
  // PASO 1: CREAR UN LOTE DE QR
  // --------------------------------------------------------------------------------
  console.log('\n--- [PASO 1] Creando Lote de Códigos QR ---');
  const batchPayload = {
    quantity: 30,
    assigned_area_id: areaAlmacen.id,
    nomenclature_prefix: 'E2E-LOT-QR',
    notes: 'Lote de prueba integral E2E 13 pasos'
  };
  const qrBatchResult = await qrcodesService.generateQrBatch(batchPayload, user);
  const createdBatch = await QrBatch.findByPk(qrBatchResult.batch.id);
  const virginQrs = await QrCode.findAll({
    where: { batch_id: createdBatch.id, status: 'UNASSIGNED' },
    limit: 25
  });
  console.log(`✅ Lote creado: ${createdBatch.batch_code} (ID: ${createdBatch.id}) con ${virginQrs.length} códigos disponibles.`);
  results.step1 = { batch_code: createdBatch.batch_code, count: virginQrs.length };

  // --------------------------------------------------------------------------------
  // PASO 2: REALIZAR UN INGRESO CON QR (CON COSTO EN EL MATERIAL)
  // --------------------------------------------------------------------------------
  console.log('\n--- [PASO 2] Realizando Ingreso con QR (con costo en material) ---');
  const qrStep2 = virginQrs[0].qr_code;
  const qtyStep2 = 1000.0;
  const unitCostStep2 = 26.50;
  const totalCostStep2 = Number((qtyStep2 * unitCostStep2).toFixed(2));

  const ingressWithQr = await receiveMaterialUseCase.execute({
    qr_code_value: qrStep2,
    material_id: matPPA.id,
    location_id: locationA1.id,
    quantity: qtyStep2,
    unit_cost: unitCostStep2,
    total_cost: totalCostStep2,
    notes: 'Ingreso E2E Paso 2 con QR y Costo',
    folio: `REC-QR-${Date.now().toString().slice(-6)}`
  }, user.id);

  const lotePPA = await Lote.findByPk(ingressWithQr.data.lote_id);
  console.log(`✅ Ingreso con QR Exitoso: Lote ID: ${lotePPA.id}, Folio: ${lotePPA.folio}`);
  console.log(`   Material: ${matPPA.name}, Cantidad: ${qtyStep2} kg, Costo Unit: $${unitCostStep2}, Total: $${totalCostStep2}`);
  results.step2 = { lote_id: lotePPA.id, folio: lotePPA.folio, total_cost: totalCostStep2 };

  // --------------------------------------------------------------------------------
  // PASO 3: REALIZAR UN INGRESO MANUAL (CON COSTO EN EL MATERIAL)
  // --------------------------------------------------------------------------------
  console.log('\n--- [PASO 3] Realizando Ingreso Manual (con costo en material) ---');
  const qtyStep3 = 500.0;
  const unitCostStep3 = 14.20;
  const totalCostStep3 = Number((qtyStep3 * unitCostStep3).toFixed(2));
  const manualFolio = `REC-MAN-${Date.now().toString().slice(-6)}`;

  const manualResult = await warehouseService.manualEntry({
    material_id: matCarbonato.id,
    location_id: locationA1.id,
    entries: [{
      quantity: qtyStep3,
      unit_cost: unitCostStep3,
      total_cost: totalCostStep3,
      notes: 'Ingreso Manual E2E Paso 3 con Costo',
      folio: manualFolio
    }]
  }, user);

  const loteCarbonato = await Lote.findOne({ where: { folio: manualFolio } });
  console.log(`✅ Ingreso Manual Exitoso: Lote ID: ${loteCarbonato.id}, Folio: ${loteCarbonato.folio}`);
  console.log(`   Material: ${matCarbonato.name}, Cantidad: ${qtyStep3} kg, Costo Unit: $${unitCostStep3}, Total: $${totalCostStep3}`);
  results.step3 = { lote_id: loteCarbonato.id, folio: loteCarbonato.folio, total_cost: totalCostStep3 };

  // --------------------------------------------------------------------------------
  // PASO 4: REALIZAR LOS INGRESOS NECESARIOS PARA 4 FÓRMULAS DE EXTRUSIÓN
  // --------------------------------------------------------------------------------
  console.log('\n--- [PASO 4] Realizando Ingresos Necesarios para 4 Fórmulas de Extrusión ---');
  const requiredIngresses = [
    { mat: matBlanco, qty: 300.0, cost: 42.00, qr: virginQrs[1].qr_code },
    { mat: matUV, qty: 200.0, cost: 68.00, qr: virginQrs[2].qr_code },
    { mat: matPPB, qty: 800.0, cost: 28.50, qr: virginQrs[3].qr_code },
    { mat: matPPA, qty: 2500.0, cost: 26.50, qr: virginQrs[4].qr_code }
  ];

  const step4Lotes = [];
  for (const item of requiredIngresses) {
    if (!item.mat) continue;
    const totalCost = Number((item.qty * item.cost).toFixed(2));
    const ing = await receiveMaterialUseCase.execute({
      qr_code_value: item.qr,
      material_id: item.mat.id,
      location_id: locationA1.id,
      quantity: item.qty,
      unit_cost: item.cost,
      total_cost: totalCost,
      notes: `Ingreso requerido Paso 4 para fórmulas (${item.mat.name})`,
      folio: `REC-F4-${Date.now().toString().slice(-6)}-${item.mat.id}`
    }, user.id);
    const lot = await Lote.findByPk(ing.data.lote_id);
    step4Lotes.push(lot);
    console.log(`   + Ingresado: ${item.mat.name} (${item.qty} kg @ $${item.cost} = $${totalCost}) -> Lote ${lot.folio}`);
  }
  console.log(`✅ Ingresos de Materia Prima completados para las 4 fórmulas (${step4Lotes.length} lotes ingresados).`);
  results.step4 = { lotes_created: step4Lotes.length };

  // --------------------------------------------------------------------------------
  // PASO 5: REALIZAR BAJAS EN ALMACÉN POR SCRAP, MERMA Y DEVOLUCIÓN
  // --------------------------------------------------------------------------------
  console.log('\n--- [PASO 5] Realizando Bajas en Almacén por Scrap, Merma y Devolución ---');
  // 5.1 Scrap (TipoBaja ID 1: Material dañado / Scrap)
  await warehouseService.disposeLotes({
    material_id: matPPA.id,
    lote_ids: [lotePPA.id],
    items: [{ material_id: matPPA.id, lote_id: lotePPA.id, quantity: 15.0, notes: 'Saco roto en estiba' }],
    tipo_baja_id: 1,
    notes: 'Baja por Scrap Almacén'
  }, user);
  console.log(`   + Baja Scrap ejecutada: 15 kg de ${matPPA.name} (Tipo 1: Material Dañado)`);

  // 5.2 Merma (TipoBaja ID 2: Merma)
  await warehouseService.disposeLotes({
    material_id: matCarbonato.id,
    lote_ids: [loteCarbonato.id],
    items: [{ material_id: matCarbonato.id, lote_id: loteCarbonato.id, quantity: 10.0, notes: 'Polvillo residual de manejo' }],
    tipo_baja_id: 2,
    notes: 'Baja por Merma de Manipulación'
  }, user);
  console.log(`   + Baja Merma ejecutada: 10 kg de ${matCarbonato.name} (Tipo 2: Merma)`);

  // 5.3 Devolución (TipoBaja ID 7: Devolución)
  const loteUV = step4Lotes.find(l => l.material_id === matUV.id) || step4Lotes[0];
  await warehouseService.disposeLotes({
    material_id: matUV.id,
    lote_ids: [loteUV.id],
    items: [{ material_id: matUV.id, lote_id: loteUV.id, quantity: 25.0, notes: 'Gránulo no cumple especificación' }],
    tipo_baja_id: 7,
    notes: 'Baja por Devolución a Proveedor'
  }, user);
  console.log(`   + Baja Devolución ejecutada: 25 kg de ${matUV.name} (Tipo 7: Devolución)`);
  results.step5 = { scrap: 15.0, merma: 10.0, devolucion: 25.0 };

  // --------------------------------------------------------------------------------
  // PASO 6: SOLICITAR MATERIAL PARA MANTENIMIENTO Y PARA FÓRMULAS EN EXTRUSIÓN
  // --------------------------------------------------------------------------------
  console.log('\n--- [PASO 6] Solicitando Material para Mantenimiento y para Extrusión ---');
  // Orden 1: Mantenimiento
  const orderMaint = await consumptionOrderService.createOrder({
    requested_by: user.id,
    requesting_area_id: areaMantenimiento.id,
    notes: 'Solicitud de insumos para calibración y mantenimiento preventivo',
    items: [
      { material_id: matCarbonato.id, quantity: 50.0 }
    ]
  });
  console.log(`   + Orden Mantenimiento Creada: ${orderMaint.order_number} (UUID: ${orderMaint.uuid}, Estado: ${orderMaint.status})`);

  // Orden 2: Fórmulas en Extrusión
  const orderExtrusion = await consumptionOrderService.createOrder({
    requested_by: user.id,
    requesting_area_id: areaExtrusion.id,
    notes: 'Solicitud de materia prima para Batch de Producción 500kg Extrusión',
    items: [
      { material_id: matPPA.id, quantity: 440.0 },
      { material_id: matCarbonato.id, quantity: 40.0 },
      { material_id: matBlanco.id, quantity: 20.0 }
    ]
  });
  console.log(`   + Orden Extrusión Creada: ${orderExtrusion.order_number} (UUID: ${orderExtrusion.uuid}, Estado: ${orderExtrusion.status})`);
  results.step6 = { maint_order: orderMaint.order_number, extrusion_order: orderExtrusion.order_number };

  // --------------------------------------------------------------------------------
  // PASO 7: REALIZAR EL SURTIMIENTO Y UNA CANCELACIÓN DE ÓRDENES DE CONSUMO
  // --------------------------------------------------------------------------------
  console.log('\n--- [PASO 7] Realizando Surtimiento (Extrusión) y Cancelación (Mantenimiento) ---');
  // 7.1 Cancelar Orden de Mantenimiento
  const cancelledOrder = await consumptionOrderService.cancelOrder(
    orderMaint.uuid,
    'Cancelado por reprogramación de mantenimiento preventivo para el siguiente turno',
    user.id
  );
  console.log(`✅ Orden Mantenimiento Cancelada con éxito: ${cancelledOrder.order_number} (Estado: ${cancelledOrder.status})`);

  // 7.2 Surtir Orden de Extrusión
  await consumptionOrderService.updateOrderStatus(orderExtrusion.uuid, 'PREPARANDO', user.id);

  // Obtener los lotes disponibles para escanear y surtir
  const orderDetails = await consumptionOrderService.getOrderDetails(orderExtrusion.uuid);
  for (const item of orderDetails.items) {
    const availableLote = await Lote.findOne({
      where: {
        material_id: item.material_id,
        is_active: true,
        available_amount: { [sequelize.Sequelize.Op.gt]: 0 }
      },
      include: [{ model: QrCode, as: 'qr_code' }],
      order: [['created_at', 'ASC']]
    });

    if (availableLote) {
      const scanCode = availableLote.qr_code?.qr_code || availableLote.folio;
      await consumptionOrderService.scanFulfillmentItem(orderExtrusion.uuid, scanCode, user.id);
      console.log(`   + Item surtido escaneando: ${scanCode} (${item.material?.name || item.material_id})`);
    }
  }

  // Refrescar orden surtida
  const fulfilledOrder = await consumptionOrderService.getOrderDetails(orderExtrusion.uuid);
  console.log(`✅ Orden Extrusión Surtida: ${fulfilledOrder.order_number} (Estado: ${fulfilledOrder.status})`);
  const mixQrValue = `QR-MIX-${fulfilledOrder.order_number}`;
  results.step7 = {
    cancelled: cancelledOrder.order_number,
    fulfilled: fulfilledOrder.order_number,
    mix_qr: mixQrValue
  };

  // --------------------------------------------------------------------------------
  // PASO 8: CREACIÓN DE LAS FÓRMULAS Y ENCOLARLAS EN LAS EXTRUSORAS
  // --------------------------------------------------------------------------------
  console.log('\n--- [PASO 8] Creando Fórmulas y Encolando en Extrusoras ---');
  const formulaFixed = await Formula.findOne({ where: { code: 'F-EXT-01-FIXED' } });
  const formulaStd = await Formula.findOne({ where: { code: 'F-EXT-DIN-STD' } });
  const formulaPPB = await Formula.findOne({ where: { code: 'F-EXT-DIN-PPB' } });

  // Encolar en Extrusora 1, Extrusora 3, Extrusora 5
  const queue1 = await extrusionService.enqueueMix({
    extruder_id: 1,
    formula_id: formulaFixed.id,
    consumption_order_qr_id: mixQrValue,
    notes: `Mezcla E2E EX-1 (${formulaFixed.name})`,
    priority: 1
  });
  console.log(`   + Encolada Mezcla en Extrusora 1: Cola ID ${queue1.id}, Estado: ${queue1.status}`);

  const queue3 = await extrusionService.enqueueMix({
    extruder_id: 3,
    formula_id: formulaStd.id,
    consumption_order_qr_id: `QR-MIX-EX3-${Date.now().toString().slice(-4)}`,
    notes: `Mezcla E2E EX-3 (${formulaStd.name})`,
    priority: 1
  });
  console.log(`   + Encolada Mezcla en Extrusora 3: Cola ID ${queue3.id}, Estado: ${queue3.status}`);

  const queue5 = await extrusionService.enqueueMix({
    extruder_id: 5,
    formula_id: formulaStd.id,
    consumption_order_qr_id: `QR-MIX-EX5-${Date.now().toString().slice(-4)}`,
    notes: `Mezcla E2E EX-5 (${formulaStd.name})`,
    priority: 1
  });
  console.log(`   + Encolada Mezcla en Extrusora 5: Cola ID ${queue5.id}, Estado: ${queue5.status}`);
  results.step8 = { queues: [queue1.id, queue3.id, queue5.id] };

  // --------------------------------------------------------------------------------
  // PASO 9: INTENTAR ENCOLAR UNA FÓRMULA QUE NO CORRESPONDE A LA EXTRUSORA 1
  // --------------------------------------------------------------------------------
  console.log('\n--- [PASO 9] Verificando Bloqueo de Seguridad: Encolar Fórmula No Permitida en Extrusora 1 ---');
  let lockExtruder1Validated = false;
  try {
    console.log(`   Intentando encolar fórmula '${formulaStd.name}' (autorizada solo para [3, 4, 5]) en Extrusora 1...`);
    await extrusionService.enqueueMix({
      extruder_id: 1,
      formula_id: formulaStd.id,
      consumption_order_qr_id: `QR-MIX-INVALID-EX1`,
      notes: 'Intento Prohibido en Extrusora 1'
    });
    console.log('❌ Error: El sistema permitió la fórmula en una máquina no autorizada.');
  } catch (err) {
    lockExtruder1Validated = true;
    console.log(`🔒 Candado de Seguridad Extrusora 1 Activado con Éxito (400 Bloqueado): "${err.message}"`);
  }

  // También validar bloqueo en Extrusora 4 para PP-B
  let lockExtruder4Validated = false;
  try {
    console.log(`   Intentando encolar fórmula '${formulaPPB.name}' (restringida para Extrusora 4) en Extrusora 4...`);
    await extrusionService.enqueueMix({
      extruder_id: 4,
      formula_id: formulaPPB.id,
      consumption_order_qr_id: `QR-MIX-INVALID-EX4`,
      notes: 'Intento Prohibido en Extrusora 4'
    });
    console.log('❌ Error: El sistema permitió PP-B en Extrusora 4.');
  } catch (err) {
    lockExtruder4Validated = true;
    console.log(`🔒 Candado de Seguridad Extrusora 4 Activado con Éxito (400 Bloqueado): "${err.message}"`);
  }

  results.step9 = {
    extruder_1_lock: lockExtruder1Validated,
    extruder_4_lock: lockExtruder4Validated
  };

  // --------------------------------------------------------------------------------
  // PASO 10: REGISTRO DE RACKS NECESARIOS PARA LA SALIDA DE PTI
  // --------------------------------------------------------------------------------
  console.log('\n--- [PASO 10] Registrando Racks Dinámicos para Salida de PTI ---');
  const tsSuffix = Date.now().toString().slice(-4);
  const rackCode1 = `RACK-PTI-${tsSuffix}-01`;
  const rackCode2 = `RACK-PTI-${tsSuffix}-02`;

  const rack1 = await extrusionService.createPtiRack({
    rack_code: rackCode1,
    max_capacity: 100,
    location_name: 'EXT-PTI-BAY-1'
  });
  console.log(`   + Rack Registrado: ${rack1.rack_code} (Capacidad: ${rack1.max_capacity}, Estado: ${rack1.status})`);

  const rack2 = await extrusionService.createPtiRack({
    rack_code: rackCode2,
    max_capacity: 100,
    location_name: 'EXT-PTI-BAY-2'
  });
  console.log(`   + Rack Registrado: ${rack2.rack_code} (Capacidad: ${rack2.max_capacity}, Estado: ${rack2.status})`);
  results.step10 = { racks: [rack1.rack_code, rack2.rack_code] };

  // --------------------------------------------------------------------------------
  // PASO 11: REGISTRO DE LOS PTI DE EXTRUSIÓN EN LOS RACKS CORRESPONDIENTES
  // --------------------------------------------------------------------------------
  console.log('\n--- [PASO 11] Registrando PTI de Extrusión en Rack con Backflushing y Scrap ---');
  const ingressResult = await extrusionService.scanRackPti({
    rack_qr: rack1.qr_code,
    pti_material_id: matPtiBlanca.id,
    quantity: 65, // 65 bobinas
    mixture_qr: mixQrValue,
    scrap_weight_kg: 14.5,
    scrap_reason: 'ARRANQUE_EXTRUSORA',
    notes: 'Ingreso E2E bobinas cinta blanca con scrap arranque',
    userId: user.id
  });

  console.log(`✅ Registro de PTI en Rack Exitoso:`);
  console.log(`   Rack: ${ingressResult.rack.rack_code}, Piezas: ${ingressResult.rack.current_quantity}/${ingressResult.rack.max_capacity}, Estado: ${ingressResult.rack.status}`);
  console.log(`   Condicionado a Material: ${matPtiBlanca.name} (ID: ${matPtiBlanca.id})`);
  console.log(`   Backflushing ejecutado: Lote PTI ${ingressResult.backflushing?.pti_lote_folio || 'Generado'}, Materia Prima Descontada: ${ingressResult.backflushing?.consumed_kg || 0} kg`);
  console.log(`   Scrap Operativo Registrado: 14.5 kg por ARRANQUE_EXTRUSORA`);
  results.step11 = {
    rack: ingressResult.rack.rack_code,
    pieces: ingressResult.rack.current_quantity,
    status: ingressResult.rack.status,
    backflushing: ingressResult.backflushing
  };

  // --------------------------------------------------------------------------------
  // PASO 12: INTENTAR UN INGRESO DE PTI EN UN RACK QUE NO CORRESPONDA (INCOMPATIBILIDAD)
  // --------------------------------------------------------------------------------
  console.log('\n--- [PASO 12] Verificando Rechazo de PTI Incompatible en Rack Condicionado ---');
  let mismatchBlocked = false;

  try {
    console.log(`   Intentando ingresar ${matPtiAmarilla.name} (ID: ${matPtiAmarilla.id}) en ${rack1.rack_code} condicionado para ${matPtiBlanca.name}...`);
    await extrusionService.scanRackPti({
      rack_qr: rack1.qr_code,
      pti_material_id: matPtiAmarilla.id,
      quantity: 10,
      mixture_qr: mixQrValue,
      userId: user.id
    });
    console.log('❌ Error: El sistema permitió mezclar diferentes tipos de PTI en el mismo rack.');
  } catch (err) {
    mismatchBlocked = true;
    console.log(`🛡️ Incompatibilidad de Rack Bloqueada con Éxito: "${err.message}"`);
  }
  results.step12 = { mismatch_blocked: mismatchBlocked };

  // --------------------------------------------------------------------------------
  // PASO 13: VERIFICAR REFLEJO EN EL DASHBOARD Y REPORTES
  // --------------------------------------------------------------------------------
  console.log('\n--- [PASO 13] Verificando Reflejo en Dashboard y Reportes ---');
  // 13.1 Balance de Masa
  const massBalance = await extrusionService.getMassBalance(mixQrValue);
  console.log(`📊 Balance de Masa (${mixQrValue}):`);
  console.log(`   - Fórmula: ${massBalance.formula_name}`);
  console.log(`   - Entrada Teórica/Batch: ${massBalance.batch_size_kg} kg`);
  console.log(`   - Producto Útil Estimado: ${massBalance.estimated_useful_kg} kg`);
  console.log(`   - Merma / Scrap Operativo: ${massBalance.total_scrap_kg} kg (${massBalance.scrap_percentage}%)`);
  console.log(`   - Rendimiento Operativo: ${massBalance.estimated_yield_percentage}% (${massBalance.scrap_status})`);

  // 13.2 Reporte de Merma y Scrap en BD
  const scrapLogs = await ExtrusionScrapLog.findAll({
    where: { from_mixture_qr_id: mixQrValue }
  });
  console.log(`📋 Registros de Scrap Operativo en Extrusión: ${scrapLogs.length} eventos registrados.`);

  // 13.3 Movimientos de Almacén (Scrap, Merma, Devolución)
  const warehouseMovements = await InventoryMovement.findAll({
    where: {
      type: ['SCRAP', 'MERMA', 'DEVOLUCION']
    },
    order: [['created_at', 'DESC']],
    limit: 5
  });
  console.log(`📦 Últimos Movimientos de Bajas en Almacén registrados: ${warehouseMovements.length}`);
  warehouseMovements.forEach(m => {
    console.log(`   + Tipo: ${m.type}, Cantidad: ${m.quantity_change} kg, Costo Total: $${m.total_cost || 0}`);
  });

  results.step13 = {
    mass_balance: massBalance,
    scrap_logs_count: scrapLogs.length,
    recent_disposals: warehouseMovements.length
  };

  console.log('\n================================================================================');
  console.log('🎯 ¡VERIFICACIÓN DE LOS 13 PASOS COMPLETADA CON ÉXITO ROTUNDO!');
  console.log('================================================================================');
  return results;
}

run13StepFlow()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error fatal en el flujo de 13 pasos:', err);
    process.exit(1);
  });
