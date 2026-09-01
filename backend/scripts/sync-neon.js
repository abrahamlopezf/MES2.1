require('dotenv').config();
process.env.NODE_ENV = 'production'; // Fuerza a database.js a usar DATABASE_URL
const db = require('../src/database/models');

async function syncNeon() {
  console.log('Synchronizing Neon database schema...');
  try {
    db.sequelize.options.logging = false;
    await db.sequelize.sync({ alter: true });
    console.log('✅ Schema synchronized successfully.');
  } catch (error) {
    console.error('❌ Error syncing schema:', error);
  } finally {
    await db.sequelize.close();
  }
}

syncNeon();
