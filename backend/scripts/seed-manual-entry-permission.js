'use strict';

require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false,
  }
);

async function run() {
  const t = await sequelize.transaction();
  try {
    // 1. Insertar permiso si no existe
    await sequelize.query(
      `INSERT INTO permissions (code, name, module, description, created_at, updated_at)
       SELECT 'warehouse.manual_entry', 'Ingreso manual de inventario', 'Warehouse', 'Permite registrar ingresos manuales de lotes virtuales al inventario', NOW(), NOW()
       WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'warehouse.manual_entry');`,
      { transaction: t }
    );
    console.log('✅ Permiso warehouse.manual_entry creado (o ya existía)');

    // 2. Obtener ID del permiso
    const [[perm]] = await sequelize.query(
      `SELECT id FROM permissions WHERE code = 'warehouse.manual_entry';`,
      { transaction: t }
    );
    if (!perm) throw new Error('No se encontró el permiso creado');
    const permId = perm.id;

    // 3. Asignar a los roles ADMIN_ALM, ADMIN_GENERAL, SUPERADMIN
    const targetRoles = ['ADMIN_ALM', 'ADMIN_GENERAL', 'SUPERADMIN'];
    const [roleRecords] = await sequelize.query(
      `SELECT id, code FROM roles WHERE code IN ('ADMIN_ALM', 'ADMIN_GENERAL', 'SUPERADMIN');`,
      { transaction: t }
    );

    for (const role of roleRecords) {
      await sequelize.query(
        `INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
         SELECT ${role.id}, ${permId}, NOW(), NOW()
         WHERE NOT EXISTS (SELECT 1 FROM role_permissions WHERE role_id = ${role.id} AND permission_id = ${permId});`,
        { transaction: t }
      );
      console.log(`✅ Permiso asignado al rol: ${role.code}`);
    }

    await t.commit();
    console.log('\n🎉 Listo. Permiso warehouse.manual_entry disponible en los roles.');
    process.exit(0);
  } catch (err) {
    await t.rollback();
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

run();
