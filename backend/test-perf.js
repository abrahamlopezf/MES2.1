const { sequelize, Lote, Inventory, InventoryMovement, User } = require('./src/database/models');
const { performance } = require('perf_hooks');

async function testPerf() {
  try {
    console.log("Authenticating DB...");
    await sequelize.authenticate();
    console.log("DB Authenticated.");

    const t = await sequelize.transaction();
    console.log("Transaction started.");

    const loteData = [
      {
        material_id: 569,
        user_id: 1,
        qr_id: null,
        location_id: 1,
        folio: `S/N-TEST-${Date.now()}-1`,
        initial_amount: 10,
        available_amount: 10,
        notes: 'Perf test',
        is_active: true
      }
    ];

    console.log("Running Lote.bulkCreate...");
    let start = performance.now();
    await Lote.bulkCreate(loteData, { transaction: t, returning: true });
    let end = performance.now();
    console.log(`Lote.bulkCreate took: ${(end - start).toFixed(2)} ms`);

    console.log("Running Inventory.findOne...");
    start = performance.now();
    let inventory = await Inventory.findOne({
      where: { material_id: 569 },
      transaction: t
    });
    end = performance.now();
    console.log(`Inventory.findOne took: ${(end - start).toFixed(2)} ms`);

    console.log("Running Inventory.save...");
    start = performance.now();
    if (inventory) {
      inventory.amount = Number(inventory.amount) + 10;
      await inventory.save({ transaction: t });
    } else {
      inventory = await Inventory.create({
        material_id: 569,
        amount: 10
      }, { transaction: t });
    }
    end = performance.now();
    console.log(`Inventory.save took: ${(end - start).toFixed(2)} ms`);

    const movementData = [{
      inventory_id: inventory.id,
      type: 'MANUAL_ENTRY',
      quantity_change: 10,
      performed_by: 1,
      notes: 'Perf test'
    }];

    console.log("Running Movement.bulkCreate...");
    start = performance.now();
    await InventoryMovement.bulkCreate(movementData, { transaction: t, returning: true });
    end = performance.now();
    console.log(`Movement.bulkCreate took: ${(end - start).toFixed(2)} ms`);

    console.log("Committing transaction...");
    start = performance.now();
    await t.commit();
    end = performance.now();
    console.log(`Transaction commit took: ${(end - start).toFixed(2)} ms`);

    process.exit(0);
  } catch (err) {
    console.error("ERROR:", err);
    process.exit(1);
  }
}

testPerf();
