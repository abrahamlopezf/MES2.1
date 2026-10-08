const bcrypt = require('bcrypt');
const { sequelize } = require('./src/config/database');

async function run() {
  try {
    const hash = await bcrypt.hash('QhBv47RkNK$1096', 10);
    await sequelize.query(`UPDATE users SET password_hash = '${hash}' WHERE username = 'nexus'`);
    console.log('SQL updated superadmin password_hash');
    process.exit(0);
  } catch (error) {
    console.error('Failed to update:', error);
    process.exit(1);
  }
}
run();
