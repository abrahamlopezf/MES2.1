const { sequelize } = require('../config/database');

async function run() {
  try {
    const [cols] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'pti_racks' 
        AND column_name IN ('container_type', 'tare_weight_kg');
    `);
    const colNames = cols.map(c => c.column_name);
    console.log('Existing columns in pti_racks:', colNames);

    if (!colNames.includes('container_type')) {
      await sequelize.query(`ALTER TABLE pti_racks ADD COLUMN container_type VARCHAR(30) DEFAULT 'CARRITO';`);
      console.log('Added container_type to pti_racks');
    }
    if (!colNames.includes('tare_weight_kg')) {
      await sequelize.query(`ALTER TABLE pti_racks ADD COLUMN tare_weight_kg NUMERIC(10,2) DEFAULT 25.00;`);
      console.log('Added tare_weight_kg to pti_racks');
    }

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

run();
