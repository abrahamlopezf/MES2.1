const { Sequelize } = require('sequelize');
const fs = require('fs');

const sequelize = new Sequelize('postgresql://neondb_owner:npg_ZyON69GToUgJ@ep-icy-shadow-avk05pd7.c-11.us-east-1.aws.neon.tech/neondb?sslmode=require', {
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
