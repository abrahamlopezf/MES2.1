const { sequelize, Inventory, Lote, Material } = require('./src/database/models');

async function testQuery() {
  try {
    const invs = await Inventory.findAll({
      include: [{ model: Material, as: 'material' }]
    });
    console.log("=== INVENTORY ===");
    for (const inv of invs) {
      console.log(`Mat: ${inv.material?.name} - Amount: ${inv.amount}`);
    }

    const lotes = await Lote.findAll({ where: { is_active: true } });
    console.log("\n=== ACTIVE LOTES ===");
    for (const l of lotes) {
      console.log(`Lote ${l.id} | Mat: ${l.material_id} | Available: ${l.available_amount}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

testQuery();
