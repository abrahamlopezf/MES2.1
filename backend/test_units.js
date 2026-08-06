const { sequelize, MaterialUnit } = require('./src/database/models');

async function test() {
  try {
    const units = await MaterialUnit.findAll();
    console.log("UNITS:", JSON.stringify(units, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
test();
