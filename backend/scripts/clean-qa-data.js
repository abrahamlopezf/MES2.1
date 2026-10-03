const { sequelize, User, QrCode, QrBatch, TraceabilityEvent, ConsumptionOrder, ConsumptionOrderItem, InventoryMovement, Lote, WipInventory } = require('../src/database/models');

async function cleanQA() {
  console.log("Iniciando limpieza de datos QA...");
  try {
    const qaUsers = await User.findAll({
      where: {
        last_name: 'QA'
      }
    });

    const userIds = qaUsers.map(u => u.id);
    console.log(`Encontrados ${userIds.length} usuarios QA.`);

    if (userIds.length === 0) {
      console.log("No hay usuarios QA para limpiar.");
      process.exit(0);
    }

    // Usar raw queries para limpiar dependencias si sequelize falla por alias/relations
    await sequelize.query(`DELETE FROM traceability_events WHERE performed_by IN (${userIds.join(',')})`);
    
    const lotes = await Lote.findAll({ where: { user_id: userIds } });
    const loteIds = lotes.map(l => l.id);
    if (loteIds.length > 0) {
        await sequelize.query(`DELETE FROM consumption_order_items WHERE lote_id IN (${loteIds.join(',')})`);
        await sequelize.query(`DELETE FROM wip_inventories WHERE lote_id IN (${loteIds.join(',')})`);
        await sequelize.query(`DELETE FROM lotes WHERE id IN (${loteIds.join(',')})`);
    }

    await sequelize.query(`DELETE FROM consumption_orders WHERE requested_by IN (${userIds.join(',')}) OR resolved_by IN (${userIds.join(',')})`);
    await sequelize.query(`DELETE FROM inventory_movements WHERE performed_by IN (${userIds.join(',')})`);
    
    await sequelize.query(`DELETE FROM qr_codes WHERE created_by IN (${userIds.join(',')})`);
    await sequelize.query(`DELETE FROM qr_batches WHERE created_by IN (${userIds.join(',')})`);
    
    await sequelize.query(`DELETE FROM users WHERE id IN (${userIds.join(',')})`);

    console.log("Datos de QA limpiados exitosamente.");
  } catch (error) {
    console.error("Error al limpiar:", error);
  } finally {
    process.exit();
  }
}

cleanQA();
