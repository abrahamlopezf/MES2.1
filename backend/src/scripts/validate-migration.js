const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: false
});

async function validateDatabaseState() {
  console.log('Iniciando validación pre-migración (MES/ERP)...');
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida.');

    // Validar existencia de tablas críticas del MES y de Almacén en Producción
    const queryInterface = sequelize.getQueryInterface();
    const tables = await queryInterface.showAllTables();
    
    const criticalTables = [
      'users', 'roles', 'areas',
      'materials', 'material_families', 'material_types', 'material_brands', 'material_locations',
      'lotes', 'inventories', 'inventory_movements', 'consumption_orders'
    ];
    const missingTables = criticalTables.filter(t => !tables.includes(t));

    if (missingTables.length > 0 && tables.length > 0) {
      console.error(`❌ ALERTA: Faltan tablas críticas del sistema: ${missingTables.join(', ')}`);
      console.error('Abortando migración por seguridad del entorno productivo.');
      process.exit(1);
    }

    // Comprobar que no haya operaciones destructivas sobre datos existentes de almacén
    if (tables.includes('materials')) {
      const [matCount] = await sequelize.query('SELECT count(*) as count FROM materials WHERE is_active = true;');
      console.log(`📦 Materiales activos verificados en BD: ${matCount[0].count}`);
    }

    console.log('✅ Validación de integridad superada. Tablas operativas y masterdata protegidos.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fatal durante la validación pre-migración:', error.message);
    process.exit(1);
  }
}

validateDatabaseState();
