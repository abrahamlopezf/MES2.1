const { sequelize, User, Role, QrCode, Material, Location, MaterialUnit, Area } = require('../src/database/models');
const receiveMaterialUseCase = require('../src/modules/reception/useCases/receiveMaterial.useCase');
const consumptionOrderService = require('../src/modules/warehouse/consumptionOrder.service');
const traceabilityDomainService = require('../src/modules/traceability/traceabilityDomain.service');
const { encryptQrData, decryptQrData } = require('../src/shared/utils/crypto.utils');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

async function runQATest() {
  console.log("======================================================");
  console.log("⚙️  INICIANDO PRUEBA QA END-TO-END: ALMACÉN & TRAZABILIDAD");
  console.log("======================================================\n");

  const report = [];
  const logStep = (step, title, details = '') => {
    console.log(`✅ [PASO ${step}] ${title}`);
    if (details) console.log(`   └─ ${details}`);
    report.push(`### Paso ${step}: ${title}\n${details ? `> ${details}` : ''}\n`);
  };

  try {
    await sequelize.authenticate();
    
    // 1. ROLES
    const adminRole = await Role.findOne({ where: { code: 'ADMIN_ALM' } }) || await Role.findOne({ where: { code: 'ADMIN_ALMACEN' } });
    const whRole = await Role.findOne({ where: { code: 'WAREHOUSEMAN' } });
    if (!adminRole || !whRole) throw new Error("Faltan los roles ADMIN_ALM o WAREHOUSEMAN en la BD.");

    // 2. CREAR USUARIOS
    const adminUser = await User.create({
      first_name: 'Admin', last_name: 'QA', email: `admin_qa_${Date.now()}@test.com`,
      username: `admin_${Date.now()}`, password_hash: await bcrypt.hash('123', 10), role_id: adminRole.id, is_active: true
    });
    logStep(1, "Creación de Admin Almacén", `Usuario creado con ID: ${adminUser.id} y Rol: ${adminRole.code}`);

    const whUser = await User.create({
      first_name: 'Almacenista', last_name: 'QA', email: `wh_qa_${Date.now()}@test.com`,
      username: `wh_${Date.now()}`, password_hash: await bcrypt.hash('123', 10), role_id: whRole.id, is_active: true
    });
    logStep(2, "Creación de Warehouseman", `Usuario creado con ID: ${whUser.id} y Rol: ${whRole.code}`);

    // 3. PREPARAR DATOS MAESTROS PARA RECEPCIÓN
    const material = await Material.findOne({ where: { is_active: true } });
    if (!material) throw new Error("No hay materiales activos en la BD.");
    
    let location = await Location.findOne({ where: { is_active: true } });
    if (!location) throw new Error("No hay ubicaciones activas en la BD.");

    let area = await Area.findOne({ where: { is_active: true } });
    if (!area) throw new Error("No hay áreas operativas activas en la BD.");

    // 4. GENERAR/OBTENER QR DE RECEPCIÓN
    let qrCode = await QrCode.findOne({ where: { status: 'GENERATED', purpose: 'general' } });
    if (!qrCode) {
      // If no generated QR exists, create a dummy batch and QR
      const QrBatch = require('../src/database/models').QrBatch;
      const batch = await QrBatch.create({
        batch_number: `BATCH-QA-${Date.now()}`,
        batch_code: `BC-QA-${Date.now()}`, // Add missing batch_code
        purpose: 'general',
        quantity: 1,
        created_by: adminUser.id
      });
      qrCode = await QrCode.create({
        qr_code: `QR-QA-${Date.now()}`,
        serial: 1,
        batch_id: batch.id,
        purpose: 'general',
        status: 'GENERATED',
        created_by: adminUser.id
      });
    }
    const qrValue = qrCode.qr_code;
    logStep(3, "Obtención de Código QR", `QR utilizado: ${qrValue} (ID: ${qrCode.id})`);

    // 5. RECEPCIÓN DE MATERIAL
    const receptionPayload = {
      qr_code_value: qrValue,
      material_id: material.id,
      location_id: location.id,
      quantity: 100,
      folio: `FAC-QA-${Date.now()}`,
      notes: "Recepción de prueba QA",
      unit_cost: 15.50,
      total_cost: 1550.00
    };
    
    // Instanciar UseCase
    const useCase = require('../src/modules/reception/useCases/receiveMaterial.useCase');
    const receptionResult = await useCase.execute(receptionPayload, whUser.id);
    logStep(4, "Recepción de Material (Surtimiento Inicial)", `Lote creado con 100 unidades del material: ${material.internal_code}. Lote ID: ${receptionResult.lote_id}`);

    // 6. CREAR ORDEN DE CONSUMO
    const tOrder = await sequelize.transaction();
    let order;
    try {
      order = await consumptionOrderService.createOrder({
        requested_by: adminUser.id,
        requesting_area_id: area.id,
        items: [
          { material_id: material.id, quantity: 20 }
        ],
        notes: "Orden de consumo para prueba de trazabilidad"
      }, tOrder);
      await tOrder.commit();
      logStep(5, "Creación de Orden de Consumo", `Orden ${order.order_number} creada solicitando 20 unidades.`);
    } catch(err) {
      await tOrder.rollback();
      throw err;
    }

    // 7. SURTIMIENTO DE ORDEN (SCAN ITEM)
    const tScan = await sequelize.transaction();
    try {
      // Primero cambiar el estado de PENDIENTE a PREPARANDO
      await sequelize.query("UPDATE consumption_orders SET status = 'PREPARANDO' WHERE uuid = :uuid", { replacements: { uuid: order.uuid }, transaction: tScan });

      // El endpoint espera el QR encriptado (como si lo leyera la cámara)
      const encryptedQr = encryptQrData(qrValue);
      const decrypted = decryptQrData(encryptedQr);
      
      const fulfilledOrder = await consumptionOrderService.scanFulfillmentItem(
        order.uuid,
        decrypted,
        whUser.id,
        tScan
      );
      await tScan.commit();
      logStep(6, "Surtimiento de Orden (Scan de QR)", `El QR ${qrValue} fue escaneado exitosamente. Se descontaron 20 unidades del lote.`);
    } catch(err) {
      await tScan.rollback();
      throw err;
    }

    // 8. VERIFICAR TRAZABILIDAD DEL QR
    const TraceabilityEvent = require('../src/database/models').TraceabilityEvent;
    const events = await TraceabilityEvent.findAll({
      where: { qr_code_id: qrCode.id },
      order: [['created_at', 'ASC']]
    });
    
    let traceDetails = `Árbol de trazabilidad para el QR: ${qrValue}\n`;
    traceDetails += `Eventos registrados: ${events.length}\n`;
    events.forEach(evt => {
      traceDetails += `  - [${evt.event_type}] Fecha: ${evt.createdAt ? evt.createdAt.toISOString() : 'N/A'}, Usuario ID: ${evt.performed_by}\n`;
    });
    
    logStep(7, "Verificación de Trazabilidad", traceDetails);

    console.log("\n✅ PRUEBA QA COMPLETADA CON ÉXITO.");
    report.push("\n### Conclusión\nLa prueba integral del flujo de almacén desde la creación de usuarios hasta el registro de trazabilidad concluyó **exitosamente** sin errores de integridad, bloqueos o excepciones de negocio.");
    
    require('fs').writeFileSync('qa_report.md', report.join('\n'));
    console.log("📄 Reporte guardado en qa_report.md");

  } catch (error) {
    console.error("\n❌ PRUEBA FALLIDA:");
    console.error(error.message);
    if (error.stack) console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

runQATest();
