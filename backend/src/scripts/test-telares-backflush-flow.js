'use strict';
const { Op } = require('sequelize');
const db = require('../database/models');
const telaresService = require('../modules/telares/telares.service');
const consumptionOrderService = require('../modules/warehouse/consumptionOrder.service');

async function runTest() {
  console.log('====================================================');
  console.log('🧪 INICIANDO PRUEBAS DE TELARES, BACKFLUSHING Y QR VIAJERO');
  console.log('====================================================\n');

  try {
    // 1. Obtener Telar y BOM
    const looms = await telaresService.getLooms();
    console.log(`✔ Telares encontrados: ${looms.length}`);
    if (looms.length === 0) throw new Error('No se encontraron telares en la base de datos.');

    const targetLoom = looms[0];
    console.log(`✔ Usando Telar: ${targetLoom.code} (${targetLoom.name})`);

    const boms = await telaresService.getBoms();
    console.log(`✔ BOMs encontradas: ${boms.length}`);
    if (boms.length === 0) throw new Error('No se encontraron BOMs en la base de datos.');

    // Seleccionamos un BOM con ruta conocida ej. TELARES -> LAMINADO -> CORTE
    const targetBom = boms.find(b => b.code === 'BOM-TEL-50-BLANCA') || boms[0];
    console.log(`✔ Usando BOM: ${targetBom.code} (${targetBom.name})`);
    console.log(`✔ Ruta definida en BOM: ${JSON.stringify(targetBom.default_route)}`);

    // 2. Asegurar Rack Maestro de Extrusión con stock de bobinas
    let ptiProduct = await db.PtiProduct.findOne();
    if (!ptiProduct) {
      ptiProduct = await db.PtiProduct.create({
        internal_code: 'PTI-TEST-001',
        name: 'CINTA PP 2.5MM BLANCA',
        denier: 850,
        width_mm: 2.5,
        color: 'BLANCO',
        is_active: true
      });
    }

    let ptiRack = await db.PtiRack.findOne({
      where: { current_quantity: { [Op.gt]: 10 } }
    });

    if (!ptiRack) {
      ptiRack = await db.PtiRack.create({
        rack_code: `RCK-TEST-${Date.now().toString().slice(-4)}`,
        status: 'EN_PRODUCCION',
        capacity: 100,
        current_quantity: 60.00,
        unit_weight_kg: 6.80,
        current_pti_type_id: ptiProduct.id,
        is_active: true
      });
    }
    console.log(`✔ Rack Maestro seleccionado: ${ptiRack.rack_code} con ${ptiRack.current_quantity} bobinas (${ptiRack.unit_weight_kg} kg/u)`);

    // 3. Asignar Rack Maestro al Telar (Urdimbre y Trama)
    const assignResult = await telaresService.assignRackToLoom({
      loom_id: targetLoom.id,
      rack_id: ptiRack.id,
      role: 'AMBOS',
      operator_id: 1
    });
    console.log(`✔ Asignación de Rack Maestro: ${assignResult.message}`);

    // Limpiar corridas activas previas en este telar si existieran
    await db.LoomRun.update({ status: 'FINALIZADA' }, { where: { loom_id: targetLoom.id, status: 'EN_PROCESO' } });

    // 4. Iniciar Corrida de Tejeduría
    const run = await telaresService.startLoomRun({
      loom_id: targetLoom.id,
      bom_id: targetBom.id,
      operator_id: 1,
      shift: 'TURNO_1',
      meters_planned: 1200,
      notes: 'Corrida de prueba automatizada'
    });
    console.log(`✔ Corrida iniciada con éxito. Folio: ${run.folio}`);

    // 5. Registrar Producción de Rollo y Ejecutar Backflushing N a N
    const metersToProduce = 500;
    const weightToProduce = 35.0; // 35 kg
    const rackQtyBefore = Number(ptiRack.current_quantity);
    const testSupervisor = await db.User.findOne({ where: { username: 'sup_tel_1150' } });
    const testOperator = await db.User.findOne({ where: { username: 'op_tel_1200' } });
    if (!testSupervisor || !testOperator) throw new Error('Se requieren usuarios activos de prueba de Telares.');

    console.log(`\n--- Reportando Rollo de ${metersToProduce}m (${weightToProduce} kg) ---`);
    const finishResult = await telaresService.finishRollAndBackflush({
      run_id: run.id,
      meters: metersToProduce,
      weight_kg: weightToProduce,
      operator_id: testOperator.id,
      recorded_by: testSupervisor.id,
      shift_supervisor_id: testSupervisor.id,
      operator_segments: [{
        operator_id: testOperator.id,
        shift_number: 1,
        meters_start: 0,
        meters_end: metersToProduce,
        weight_start_kg: 0,
        weight_end_kg: weightToProduce,
      }],
      notes: 'Rollo terminado prueba QA'
    });

    const producedRoll = finishResult.roll;
    console.log(`✔ Rollo producido exitosamente:`);
    console.log(`   - Código Rollo: ${producedRoll.roll_code}`);
    console.log(`   - QR Viajero: ${producedRoll.qr_code}`);
    console.log(`   - Etapa Actual: ${producedRoll.current_stage}`);
    console.log(`   - Siguiente Etapa Requerida: ${producedRoll.next_allowed_stage}`);
    console.log(`   - Ruta Oficial: ${JSON.stringify(producedRoll.route)}`);

    // Validar Backflushing
    console.log(`✔ Deducciones de Backflushing N a N registradas: ${finishResult.backflush.length}`);
    for (const bf of finishResult.backflush) {
      console.log(`   * Rol: ${bf.role} | Teórico: ${bf.theoretical_kg} kg | Bobinas descontadas: ${bf.spools_consumed} | Saldo Rack Antes: ${bf.rack_balance_spools_before} -> Después: ${bf.rack_balance_spools_after}`);
    }

    // Verificar Rack en Base de Datos
    await ptiRack.reload();
    console.log(`✔ Saldo en BD del Rack Maestro '${ptiRack.rack_code}': ${ptiRack.current_quantity} bobinas (Antes: ${rackQtyBefore})`);
    if (Number(ptiRack.current_quantity) >= rackQtyBefore) {
      throw new Error('FALLO BACKFLUSHING: El inventario del Rack Maestro no se dedujo.');
    }

    // 6. PRUEBAS DE ENRUTAMIENTO ESTRICTO CON QR VIAJERO
    console.log('\n--- Pruebas de Bloqueo / Validación de Ruteo QR Viajero ---');

    // Prueba A: Intento de escaneo en área no incluida en la ruta (ej. 'EXTRUSION')
    const scanInvalidArea = await telaresService.validateViajeroScan({
      qr_code: producedRoll.qr_code,
      area_name: 'EXTRUSION',
      operator_id: 1
    });
    console.log(`Test A (Área fuera de ruta):`);
    console.log(`   - Permitido: ${scanInvalidArea.is_allowed}`);
    console.log(`   - Error Code: ${scanInvalidArea.error_code}`);
    console.log(`   - Mensaje: ${scanInvalidArea.message}`);
    if (scanInvalidArea.is_allowed !== false || scanInvalidArea.error_code !== 'AREA_NOT_IN_ROUTE') {
      throw new Error('FALLO RUTEO: Debería haber bloqueado el área no permitida.');
    }

    // Prueba B: Intento de salto de etapa (ej. Escanear en 'CORTE' saltándose 'LAMINADO')
    const scanOutOfSequence = await telaresService.validateViajeroScan({
      qr_code: producedRoll.qr_code,
      area_name: 'CORTE',
      operator_id: 1
    });
    console.log(`Test B (Salto de etapa fuera de secuencia):`);
    console.log(`   - Permitido: ${scanOutOfSequence.is_allowed}`);
    console.log(`   - Error Code: ${scanOutOfSequence.error_code}`);
    console.log(`   - Mensaje: ${scanOutOfSequence.message}`);
    if (scanOutOfSequence.is_allowed !== false || scanOutOfSequence.error_code !== 'OUT_OF_SEQUENCE') {
      throw new Error('FALLO RUTEO: Debería haber bloqueado el salto de secuencia.');
    }

    // Prueba C: Escaneo en la etapa válida siguiente ('LAMINADO')
    const nextStage = producedRoll.next_allowed_stage; // e.g. LAMINADO
    const scanValidStage = await telaresService.validateViajeroScan({
      qr_code: producedRoll.qr_code,
      area_name: nextStage,
      operator_id: 1
    });
    console.log(`Test C (Estación válida siguiente: '${nextStage}'):`);
    console.log(`   - Permitido: ${scanValidStage.is_allowed}`);
    console.log(`   - Mensaje: ${scanValidStage.message}`);
    if (!scanValidStage.is_allowed) {
      throw new Error(`FALLO RUTEO: Debería haber permitido el escaneo en la etapa válida ${nextStage}.`);
    }

    // 7. Procesar Etapa en Laminado y Avanzar Ruta
    console.log(`\n--- Procesando etapa '${nextStage}' ---`);
    const processResult = await telaresService.processViajeroStage({
      qr_code: producedRoll.qr_code,
      target_stage: nextStage,
      operator_id: 1,
      notes: `Laminado aplicado con éxito`
    });
    console.log(`✔ Etapa completada: ${processResult.message}`);
    console.log(`   - Nueva Etapa Actual: ${processResult.roll.current_stage}`);
    console.log(`   - Siguiente Etapa Autorizada: ${processResult.roll.next_allowed_stage}`);
    console.log(`   - Historial de Etapas: ${JSON.stringify(processResult.roll.stages_history.map(s => s.stage))}`);

    // 8. PRUEBA DE SEPARACIÓN DE ODCs (Materia Prima vs Consumibles)
    console.log('\n--- Pruebas de Separación de ODCs (Materia Prima -> WIP vs Consumibles -> Gasto Operativo) ---');
    
    // Material MP
    const rawMaterial = await db.Material.findOne({
      where: { family_id: 43 },
      include: [{ model: db.MaterialFamily, as: 'family' }]
    });
    // Material Consumible
    const consumableMaterial = await db.Material.findOne({
      where: { family_id: 36 }, // MATCONS
      include: [{ model: db.MaterialFamily, as: 'family' }]
    });

    console.log(`✔ Material MP seleccionado: ID ${rawMaterial?.id} (${rawMaterial?.internal_code} - ${rawMaterial?.name})`);
    console.log(`✔ Material Consumible seleccionado: ID ${consumableMaterial?.id} (${consumableMaterial?.internal_code} - ${consumableMaterial?.name})`);

    // Crear Lote con stock disponible para ambos si no tienen
    async function ensureLot(materialId, folioPrefix) {
      let lot = await db.Lote.findOne({
        where: { material_id: materialId, available_amount: { [Op.gt]: 50 } }
      });
      if (!lot) {
        let batch = await db.QrBatch.findOne();
        if (!batch) {
          batch = await db.QrBatch.create({
            batch_number: 'BATCH-TEST-ODC',
            total_qrs: 1000,
            type: 'INVENTORY_LOT',
            created_by: 1
          });
        }
        const qr = await db.QrCode.create({
          serial: Date.now() + Math.floor(Math.random() * 10000),
          qr_code: `QR-LOT-${folioPrefix}-${Date.now().toString().slice(-4)}`,
          batch_id: batch.id,
          purpose: 'INVENTORY_LOT',
          status: 'ACTIVE',
          created_by: 1,
          is_active: true
        });
        lot = await db.Lote.create({
          folio: `LOT-${folioPrefix}-${Date.now().toString().slice(-4)}`,
          material_id: materialId,
          initial_amount: 100,
          available_amount: 100,
          unit_id: 4, // KG
          user_id: 1,
          qr_id: qr.id,
          is_active: true
        });
      }
      return lot;
    }

    const mpLot = await ensureLot(rawMaterial.id, 'MP');
    const consLot = await ensureLot(consumableMaterial.id, 'CONS');

    // Crear ODC para área de Telares (ID 3) con MP
    const orderMp = await consumptionOrderService.createOrder({
      requested_by: 1,
      requesting_area_id: 3, // TELARES
      items: [{ material_id: rawMaterial.id, quantity: 10 }],
      notes: 'Prueba ODC Materia Prima Telares'
    });
    console.log(`✔ ODC Materia Prima creada: ${orderMp.order_number}`);

    // Verificar que tiene QR Hijo generado para WIP
    const orderMpDetails = await consumptionOrderService.getOrderDetails(orderMp.uuid);
    const mpItem = orderMpDetails.items[0];
    console.log(`   - Item MP Child QR ID: ${mpItem.child_qr_id} (Tiene QR Hijo para WIP: ${!!mpItem.child_qr_id})`);
    if (!mpItem.child_qr_id) {
      throw new Error('FALLO ODC: La Materia Prima en área de proceso debe generar QR hijo para WIP.');
    }

    // Crear ODC para área de Telares (ID 3) con Consumible
    const orderCons = await consumptionOrderService.createOrder({
      requested_by: 1,
      requesting_area_id: 3, // TELARES
      items: [{ material_id: consumableMaterial.id, quantity: 5 }],
      notes: 'Prueba ODC Consumible Telares'
    });
    console.log(`✔ ODC Consumible creada: ${orderCons.order_number}`);

    const orderConsDetails = await consumptionOrderService.getOrderDetails(orderCons.uuid);
    const consItem = orderConsDetails.items[0];
    console.log(`   - Item Consumible Child QR ID: ${consItem.child_qr_id} (QR Hijo es null para gasto directo: ${consItem.child_qr_id === null})`);
    if (consItem.child_qr_id !== null) {
      throw new Error('FALLO ODC: El Consumible NO debe generar QR hijo para WIP.');
    }

    // Surtir ambas órdenes y verificar separación
    await consumptionOrderService.updateOrderStatus(orderMp.uuid, 'PREPARANDO', 1);
    await consumptionOrderService.updateOrderStatus(orderCons.uuid, 'PREPARANDO', 1);

    // Surtir MP
    await mpLot.reload({ include: [{ model: db.QrCode, as: 'qr_code' }] });
    const mpScanCode = mpLot.qr_code?.qr_code || mpLot.folio;
    await consumptionOrderService.scanFulfillmentItem(orderMp.uuid, mpScanCode, 1);
    console.log(`✔ ODC MP surtida con éxito.`);

    // Verificar existencia en WipInventory de Telares (area_id = 3)
    const wipMp = await db.WipInventory.findOne({
      where: { area_id: 3, material_id: rawMaterial.id }
    });
    console.log(`   - WipInventory Telares (MP): Cantidad registrada = ${wipMp ? wipMp.amount : 0} KG`);
    if (!wipMp || Number(wipMp.amount) <= 0) {
      throw new Error('FALLO ODC: La Materia Prima no ingresó al WIP de Telares.');
    }

    // Surtir Consumible
    await consLot.reload({ include: [{ model: db.QrCode, as: 'qr_code' }] });
    const consScanCode = consLot.qr_code?.qr_code || consLot.folio;
    await consumptionOrderService.scanFulfillmentItem(orderCons.uuid, consScanCode, 1);
    console.log(`✔ ODC Consumible surtida con éxito.`);

    // Verificar que el Consumible NO entró al WipInventory
    const wipCons = await db.WipInventory.findOne({
      where: { area_id: 3, material_id: consumableMaterial.id }
    });
    console.log(`   - WipInventory Telares (Consumible): Existe en WIP? = ${!!wipCons}`);
    if (wipCons) {
      throw new Error('FALLO ODC: El Consumible NO debe ingresar a WipInventory (debe ir directo a gasto operativo).');
    }

    console.log('\n====================================================');
    console.log('🎉 TODAS LAS PRUEBAS DE TELARES, BACKFLUSHING Y ODC PASARON AL 100%');
    console.log('====================================================\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR EN PRUEBAS:', error);
    process.exit(1);
  }
}

runTest();
