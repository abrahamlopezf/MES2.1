const { sequelize } = require('./src/config/database');
async function run() {
  await sequelize.query(`DELETE FROM users WHERE username LIKE 'QATES%'`);
  console.log('Deleted QA users');
  process.exit(0);
}
run();
