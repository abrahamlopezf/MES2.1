require('dotenv').config();
if (!process.env.REMOTE_DATABASE_URL) throw new Error('REMOTE_DATABASE_URL is required for this script.');
const { Sequelize } = require('sequelize');

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
  try {
    const queryInterface = sequelize.getQueryInterface();
    const tables = await queryInterface.showAllTables();
    console.log('Tables:', tables);

    if (tables.includes('traceability_events')) {
      const desc = await queryInterface.describeTable('traceability_events');
      console.log('traceability_events schema:', desc);
    }
    if (tables.includes('sequelize_meta')) {
      const meta = await sequelize.query('SELECT * FROM sequelize_meta', { type: Sequelize.QueryTypes.SELECT });
      console.log('Migrations run:', meta);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await sequelize.close();
  }
}
check();
