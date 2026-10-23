const { sequelize } = require('../config/database');

async function main() {
  const [silos] = await sequelize.query("SELECT * FROM material_locations WHERE name ILIKE '%SILO%' OR code ILIKE '%SILO%'");
  console.log('Silo locations:', silos);

  const [areas] = await sequelize.query("SELECT * FROM areas");
  console.log('Areas:', areas);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
