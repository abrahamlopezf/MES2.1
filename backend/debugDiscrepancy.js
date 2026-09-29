const { sequelize, Inventory, Lote, Material } = require('./src/database/models');

async function debugDiscrepancy() {
  try {
    const material = await Material.findOne({ where: { name: 'Material de Prueba' } });
    if (!material) {
      console.log("Material no encontrado");
      process.exit(1);
    }

    const inventory = await Inventory.findOne({ where: { material_id: material.id } });
    console.log(`\n=== INVENTARIO ===`);
    console.log(`Inventory amount: ${inventory ? inventory.amount : 'N/A'}`);

    const lotes = await Lote.findAll({ where: { material_id: material.id } });
    console.log(`\n=== LOTES ===`);
    let totalLotesAmount = 0;
    lotes.forEach(l => {
      console.log(`Lote ${l.id} - Folio: ${l.folio} - Initial: ${l.initial_amount} - Available: ${l.available_amount} - Active: ${l.is_active}`);
      totalLotesAmount += Number(l.available_amount);
    });
    console.log(`Suma de available_amount: ${totalLotesAmount}`);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

debugDiscrepancy();
