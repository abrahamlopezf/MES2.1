'use strict';

require('dotenv').config();
const { validateAndResolveDbConfig } = require('../config/dbGuard');
const { sequelize, testDatabaseConnection } = require('../config/database');

async function validateDatabaseState() {
  console.log('Iniciando validación pre-migración y verificación de ambiente (MES/ERP)...');
  try {
    const resolvedCfg = validateAndResolveDbConfig(process.env);
    const identity = await testDatabaseConnection();
    console.log(
      `✅ Conexión y guarda de ambiente verificadas [APP_ENV=${resolvedCfg.appEnv} | DB=${identity.db}].`
    );

    const queryInterface = sequelize.getQueryInterface();
    const tables = await queryInterface.showAllTables();

    const criticalTables = [
      'users',
      'roles',
      'areas',
      'materials',
      'material_families',
      'material_types',
      'material_brands',
      'material_locations',
      'lotes',
      'inventories',
      'inventory_movements',
      'consumption_orders',
    ];
    const missingTables = criticalTables.filter((t) => !tables.includes(t));

    if (missingTables.length > 0 && tables.length > 0) {
      console.error(`❌ ALERTA: Faltan tablas críticas del sistema: ${missingTables.join(', ')}`);
      console.error('Abortando operación por seguridad del entorno.');
      process.exit(1);
    }

    if (tables.includes('materials')) {
      const [matCount] = await sequelize.query(
        'SELECT count(*)::int as count FROM materials WHERE is_active = true;'
      );
      console.log(`📦 Materiales activos verificados en BD: ${matCount[0].count}`);
    }

    console.log('✅ Validación de integridad superada. Tablas operativas y Master Data protegidas.');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fatal durante la validación pre-migración:', error.message);
    process.exit(1);
  }
}

validateDatabaseState();
