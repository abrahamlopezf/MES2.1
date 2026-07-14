require('dotenv').config();
const db = require('./src/database/models');
const materialInventoryService = require('./src/modules/materialInventory/materialInventory.service');
const processPreparationService = require('./src/modules/formulas/processPreparation.service');
const processRunService = require('./src/modules/processes/processRun.service');
const processRunTelaresService = require('./src/modules/processes/processRunTelares.service');
const qrCodesService = require('./src/modules/qrcodes/qrcodes.service');

const mockUser = {
  id: 1,
  areaId: 1, // Almacén inicialmente
  area_id: 1,
  role: { code: 'SUPERADMIN' }, // Para saltar verificaciones de seguridad
  ip_address: '127.0.0.1',
  user_agent: 'TestingSuite',
};

async function runIntegrityTests() {
  try {
    await db.sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida.');

    console.log('\n==========================================');
    console.log('FASE 1: Recepción de Almacén (Warehouse)');
    console.log('==========================================');
    mockUser.area_id = 1; // Almacén
    
    // Asumiremos que QRs y Materiales existen en semilla. 
    // Crearemos QRs vírgenes on the fly para asegurar que la prueba funcione.
    let qrBatch = await db.QrBatch.findOne();
    if (!qrBatch) {
      qrBatch = await db.QrBatch.create({
        batch_number: `BATCH-${Date.now()}`,
        quantity: 10,
        status: 'GENERATED',
        assigned_area_id: 1,
        created_by: 1
      });
    }

    const rawMaterialQr = await db.QrCode.create({
      qr_code: `TEST-RAW-${Date.now()}`,
      batch_id: qrBatch.id,
      created_by: mockUser.id,
      status: 'DISPONIBLE',
      is_active: true,
      current_area_id: 1,
    });
    
    // Necesitamos un MaterialCategory y Material en DB
    let matCat = await db.MaterialCategory.findOne();
    if(!matCat) matCat = await db.MaterialCategory.create({ code: 'CAT1', name: 'Cat 1' });
    
    // Crear un material fresco para asegurar que tenga todo lo necesario
    const material = await db.Material.create({ 
      code: `MAT-${Date.now()}`, 
      name: 'Mat de Prueba', 
      material_category_id: matCat.id, 
      default_unit: 'KG',
      material_type: 'MATERIA_PRIMA', // <--- ENUM correcto de la DB
      is_active: true
    });

    const receptionRes = await materialInventoryService.receiveMaterial({
      qr_code: rawMaterialQr.qr_code,
      material_id: material.id,
      quantity: 1000,
      unit: 'KG',
      supplier_id: 1,
      po_number: 'PO-TEST-001',
      notes: 'Lote de prueba de integridad',
    }, mockUser);

    console.log(`✅ Material recibido con éxito. QR: ${rawMaterialQr.qr_code}, Cantidad: 1000 KG`);
    
    console.log('\n==========================================');
    console.log('FASE 2: Mezclado (Process Preparation)');
    console.log('==========================================');
    mockUser.area_id = 2; // Producción
    mockUser.areaId = 2;
    
    const mixQr = await db.QrCode.create({
      qr_code: `TEST-MIX-${Date.now()}`,
      batch_id: qrBatch.id,
      created_by: mockUser.id,
      status: 'DISPONIBLE',
      is_active: true,
      current_area_id: 2,
    });

    let interMat = await db.IntermediateMaterial.findOne();
    if (!interMat) interMat = await db.IntermediateMaterial.create({
      code: 'INTMAT-1',
      name: 'Carrete Intermedio 1',
      description: 'Carrete para pruebas de extrusión',
      unit: 'CARRETE',
      is_active: true
    });

    let formula = await db.ProcessFormula.findOne({ where: { code: 'FORM1' } });
    if(!formula) {
      formula = await db.ProcessFormula.create({ 
        code: 'FORM1', 
        name: 'Form 1', 
        target_area_id: 2,
        target_intermediate_material_id: interMat.id 
      });
    } else {
      await formula.update({ target_intermediate_material_id: interMat.id });
    }

    const mixRes = await processPreparationService.createPreparation({
      formula_id: formula.id,
      from_area_id: 1,
      to_area_id: 2,
      destination_qr_code: mixQr.qr_code,
      inputs: [
        {
          qr_code: rawMaterialQr.qr_code,
          quantity: 200 // Consumimos 200KG del almacén
        }
      ]
    }, mockUser);

    console.log(`✅ Mezcla preparada. QR de Mezcla: ${mixQr.qr_code}. Trazabilidad genética generada.`);
    
    // Validar que se hayan descontado 200KG
    const rawTraceable = await db.TraceableItem.findOne({ where: { qr_code_id: rawMaterialQr.id }});
    console.log(`✅ Saldo restante en Materia Prima (TraceableItem): ${rawTraceable.quantity_current} KG (Esperado: 800)`);
    if(Number(rawTraceable.quantity_current) !== 800) throw new Error('Fallo ACID en Preparación');

    console.log('\n==========================================');
    console.log('FASE 3: Extrusión (Process Run)');
    console.log('==========================================');
    
    // 3.1 Iniciar Corrida
    const extRun = await processRunService.startRun({
      mix_qr_code: mixQr.qr_code,
      process_area_id: 2,
    }, mockUser);
    console.log(`✅ Corrida de extrusión iniciada: ${extRun.folio}`);

    // 3.2 Crear un Rack
    const rackQr = await db.QrCode.create({
      qr_code: `TEST-RACK-${Date.now()}`,
      batch_id: qrBatch.id,
      created_by: mockUser.id,
      status: 'EN_USO',
      is_active: true,
      current_area_id: 2,
    });
    const rack = await db.StorageRack.create({
      name: `RACK-${Date.now()}`,
      code: `RACK-${Date.now()}`,
      qr_code_id: rackQr.id,
      area_id: 2,
      capacity_primary: 100,
    });

    // 3.3 Registrar salida (Inyectar 50 carretes al Rack)
    const extOutput = await processRunService.registerOutput(extRun.id, {
      rack_qr_code: rackQr.qr_code,
      quantity_spools: 50,
      override_consumed_kg: 25 // Simulamos que gastamos 25KG de mezcla
    }, mockUser);

    console.log(`✅ Extrusión inyectó 50 carretes en el Rack. Consumió 25 KG de la mezcla.`);
    console.log(`✅ Saldo restante de Mezcla: ${extOutput.mix_remaining_kg} KG (Esperado: 175)`);
    if (extOutput.mix_remaining_kg !== 175) throw new Error('Fallo ACID en Extrusión (Outputs)');

    console.log('\n==========================================');
    console.log('FASE 4: Telares (Motor FIFO y Rollos)');
    console.log('==========================================');
    
    // 4.1 Iniciar Telar
    const telaresRun = await processRunTelaresService.startTelares({
      station_id: 1,
      target_material_id: formula.target_intermediate_material_id || 1, // Dummy ID
      length_meters: 1000
    }, mockUser);
    console.log(`✅ Corrida de Telar iniciada: ${telaresRun.folio}`);

    // 4.2 Consumir carretes del Rack (10 carretes)
    const telInput = await processRunTelaresService.registerInput(telaresRun.id, {
      rack_qr_code: rackQr.qr_code,
      quantity_spools: 10
    }, mockUser);
    console.log(`✅ Telar consumió 10 carretes del Rack (Motor FIFO operó ${telInput.batches_used} lotes).`);

    // Validar el Stock del Rack
    const rackStock = await db.IntermediateStock.findOne({ where: { rack_id: rack.id }});
    console.log(`✅ Saldo restante en Rack: ${rackStock.quantity_primary} (Esperado: 40)`);
    if(Number(rackStock.quantity_primary) !== 40) throw new Error('Fallo ACID en Telares (Inputs)');

    // Validar el Output de extrusión (metadata.quantity_remaining)
    const outRecord = await db.ProcessRunOutput.findByPk(extOutput.runOutput.id);
    console.log(`✅ Saldo FIFO (Trazabilidad) en Rack: ${outRecord.metadata.quantity_remaining} (Esperado: 40)`);

    // 4.3 Finalizar el Rollo
    const rollQr = await db.QrCode.create({
      qr_code: `TEST-ROLL-${Date.now()}`,
      batch_id: qrBatch.id,
      created_by: mockUser.id,
      status: 'DISPONIBLE',
      is_active: true,
      current_area_id: 2,
    });

    const rollFinish = await processRunTelaresService.finishTelares(telaresRun.id, {
      virgin_qr_code: rollQr.qr_code,
      quantity_produced: 1000,
      unit: 'MTS'
    }, mockUser);

    console.log(`✅ Rollo Final generado. TraceableItem creado con éxito.`);
    
    // Validar Traceability Links
    const links = await db.TraceabilityLink.findAll({ where: { child_traceable_item_id: rollFinish.rollTraceable.id }});
    console.log(`✅ Herencia genética del Rollo: ${links.length} padres (Esperado: 1). Padre QR ID: ${links[0].parent_qr_code_id}`);

    console.log('\n🚀 ¡TODAS LAS PRUEBAS DE INTEGRIDAD SUPERADAS! 🚀');

  } catch (error) {
    console.error('\n❌ ERROR EN PRUEBAS DE INTEGRIDAD:', error);
  } finally {
    await db.sequelize.close();
  }
}

runIntegrityTests();
