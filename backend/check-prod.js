const { Sequelize } = require('sequelize');
const fs = require('fs');

const sequelize = new Sequelize('postgresql://neondb_owner:npg_ZyON69GToUgJ@ep-icy-shadow-avk05pd7.c-11.us-east-1.aws.neon.tech/neondb?sslmode=require', {
  dialect: 'postgres',
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized: false }
  },
  logging: false
});

async function run() {
  let log = '';
  try {
    const qi = sequelize.getQueryInterface();
    const qrDesc = await qi.describeTable('qr_codes');
    log += '=== QR_CODES COLUMNS ===\n';
    log += Object.keys(qrDesc).join(', ') + '\n\n';

    const stockDesc = await qi.describeTable('stock_units');
    log += '=== STOCK_UNITS COLUMNS ===\n';
    log += Object.keys(stockDesc).join(', ') + '\n\n';

    const meta = await sequelize.query('SELECT * FROM sequelize_meta', { type: Sequelize.QueryTypes.SELECT });
    log += '=== SEQUELIZE_META ===\n';
    log += meta.map(m => m.name).join('\n') + '\n';
  } catch(e) {
    log += 'ERROR: ' + e.message;
  } finally {
    fs.writeFileSync('prod-check.txt', log);
    await sequelize.close();
  }
}
run();
