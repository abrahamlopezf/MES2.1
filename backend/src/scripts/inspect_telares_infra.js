const { sequelize } = require('../database/models');
sequelize.options.logging = false;

async function inspect() {
  try {
    console.log('--- REVISIÓN DE ÁREAS ---');
    const [areas] = await sequelize.query('SELECT id, name, code FROM areas ORDER BY id ASC', { logging: false });
    console.table(areas);

    console.log('--- TABLAS CON "BOM", "TELAR", "LOOM", "ROUTING", "VIAJERO", "LAMINADO", "GLOBO" ---');
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND (
          table_name ILIKE '%bom%' 
          OR table_name ILIKE '%telar%' 
          OR table_name ILIKE '%loom%'
          OR table_name ILIKE '%rout%'
          OR table_name ILIKE '%viajero%'
          OR table_name ILIKE '%lamin%'
          OR table_name ILIKE '%globo%'
          OR table_name ILIKE '%corte%'
        )
      ORDER BY table_name ASC;
    `, { logging: false });
    console.table(tables);

    console.log('--- TABLAS PTI Y RACKS ---');
    const [ptiTables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND (table_name ILIKE '%pti%' OR table_name ILIKE '%rack%')
      ORDER BY table_name ASC;
    `, { logging: false });
    console.table(ptiTables);

    console.log('--- COLUMNAS DE PTI RACKS ---');
    const [rackCols] = await sequelize.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'pti_racks'", { logging: false });
    console.table(rackCols);

    console.log('--- COLUMNAS DE PTI PRODUCTS ---');
    const [prodCols] = await sequelize.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'pti_products'", { logging: false });
    console.table(prodCols);

    console.log('--- MUESTRA DE PTI RACKS ---');
    const [sampleRacks] = await sequelize.query("SELECT * FROM pti_racks LIMIT 5;", { logging: false });
    console.table(sampleRacks);

    console.log('--- COLUMNAS DE VIAJERO_ROLLS ---');
    const [rollCols] = await sequelize.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'viajero_rolls'", { logging: false });
    console.table(rollCols);
  } catch (err) {
    console.error('ERROR EN INSPECT:', err);
  }
}

inspect().finally(() => process.exit(0));
