require('dotenv').config();
if (!process.env.REMOTE_DATABASE_URL) throw new Error('REMOTE_DATABASE_URL is required for this script.');
const { Sequelize } = require('sequelize');
const fs = require('fs');

const sequelize = new Sequelize(process.env.REMOTE_DATABASE_URL, {
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
