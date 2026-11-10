require('dotenv').config();
if (!process.env.REMOTE_DATABASE_URL) throw new Error('REMOTE_DATABASE_URL is required for this script.');
const { Sequelize } = require('sequelize');
const fs = require('fs');

const sequelize = new Sequelize(process.env.REMOTE_DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: false
});

async function check() {
  let log = '';
  try {
    const queryInterface = sequelize.getQueryInterface();
    const tables = await queryInterface.showAllTables();
    log += 'Tables: ' + tables.join(', ') + '\n';

    if (tables.includes('sequelize_meta')) {
      const meta = await sequelize.query('SELECT * FROM sequelize_meta', { type: Sequelize.QueryTypes.SELECT });
      log += 'Migrations run:\n' + JSON.stringify(meta, null, 2) + '\n';
    }
  } catch (err) {
    log += 'Error: ' + err.message + '\n' + err.stack + '\n';
  } finally {
    await sequelize.close();
    fs.writeFileSync('db-status.txt', log);
  }
}
check();
