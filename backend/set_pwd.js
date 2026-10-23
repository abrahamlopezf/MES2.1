const bcrypt = require('bcrypt');
const { sequelize } = require('./src/config/database');

async function run() {
  try {
    const hash = await bcrypt.hash('Admin123!', 10);
    await sequelize.query(`UPDATE users SET password_hash = '${hash}', must_change_password = false WHERE username IN ('nexus', 'admin_alm', 'admin')`);
    console.log('SQL updated users password_hash and must_change_password = false to Admin123!');
    process.exit(0);
  } catch (error) {
    console.error('Failed to update:', error);
    process.exit(1);
  }
}
run();
