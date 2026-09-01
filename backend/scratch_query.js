const { sequelize } = require('./src/database/models');

async function run() {
  try {
    const { sequelize } = require('./src/database/models');
    await sequelize.authenticate();
    const [cols] = await sequelize.query(`
      SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'material_families';
    `);
    console.log("Cols:", cols);
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  } finally {
    await sequelize.close();
  }
}

run();
