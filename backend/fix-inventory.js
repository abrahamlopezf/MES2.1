const { sequelize, Inventory, Lote } = require('./src/database/models');
async function fixInventory() {
  const transaction = await sequelize.transaction();
  try {
    const inventories = await Inventory.findAll({ transaction });
    for (const inv of inventories) {
      const sum = await Lote.sum('available_amount', {
        where: { material_id: inv.material_id, is_active: true },
        transaction
      });
      inv.amount = sum || 0;
      await inv.save({ transaction });
    }
    await transaction.commit();
    console.log('Fixed inventory!');
  } catch (e) {
    await transaction.rollback();
    console.error(e);
  } finally {
    process.exit(0);
  }
}
fixInventory();
