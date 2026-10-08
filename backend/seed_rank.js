const { sequelize } = require('./src/config/database');
async function run() {
  await sequelize.query('INSERT INTO rankings (id, name, nomenclature, created_at, updated_at) VALUES (1, \'Test\', \'T\', NOW(), NOW()) ON CONFLICT (id) DO NOTHING;');
  console.log('seeded ranking');
  process.exit();
}
run();
