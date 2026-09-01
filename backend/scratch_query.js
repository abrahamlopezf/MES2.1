const { sequelize } = require('./src/database/models');

async function run() {
  try {
    const { sequelize } = require('./src/database/models');
    await sequelize.authenticate();
    const [results] = await sequelize.query(`
      SELECT amount FROM inventories WHERE material_id = 1187;
    `);
    console.log(results);
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  } finally {
    await sequelize.close();
  }
}

run();
