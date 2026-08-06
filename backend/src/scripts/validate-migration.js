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

    // Validar existencia de tablas críticas del MES
    const queryInterface = sequelize.getQueryInterface();
    const tables = await queryInterface.showAllTables();
    
    const criticalTables = ['users', 'roles', 'areas'];
    const missingTables = criticalTables.filter(t => !tables.includes(t));

    if (missingTables.length > 0 && tables.length > 0) {
      // Si hay algunas tablas pero faltan las críticas, es un estado inconsistente
      console.error(`❌ ALERTA: Faltan tablas críticas del sistema: ${missingTables.join(', ')}`);
      console.error('Abortando migración por seguridad del entorno productivo.');
      process.exit(1);
    }

    console.log('✅ Validación de integridad superada. Listo para migrar.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fatal durante la validación pre-migración:', error.message);
    process.exit(1);
  }
}

validateDatabaseState();
