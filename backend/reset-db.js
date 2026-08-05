const { sequelize } = require('./src/database/models');
const db = require('./src/database/models');

async function resetDB() {
  try {
    console.log('Connecting to DB...');
    await sequelize.authenticate();
    
    console.log('Starting data wipe for non-identity tables...');
    
    const modelsToClear = [
      db.AuditLog,
      db.QrEvent,
      db.TraceabilityMovement,
      db.TraceabilityLink,
      db.TraceableItem,
      db.QrAreaAssignment,
      db.StockUnit,
      db.QrCode,
      db.QrBatch,
      db.Material,
      db.MaterialCode,
      db.MaterialFamily,
      db.MaterialBrand,
      db.MaterialType,
      db.OperationalArea
    ];

    for (const Model of modelsToClear) {
      if (Model) {
        console.log(`Clearing ${Model.name}...`);
        await Model.destroy({ where: {}, force: true });
      }
    }
    
    console.log('Data wipe successful. Identity tables (Users, Roles, Areas) were kept intact.');
    process.exit(0);
  } catch (error) {
    console.error('Error wiping database:', error);
    process.exit(1);
  }
}

resetDB();
