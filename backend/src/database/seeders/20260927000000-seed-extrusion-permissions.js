'use strict';

const EXTRUSION_PERMISSIONS = [
  { code: 'extrusion.view', name: 'Ver Extrusión', module: 'Extrusión', description: 'Ver módulo de Extrusión.' },
  { code: 'extrusion.formulas.view', name: 'Ver Fórmulas', module: 'Extrusión', description: 'Ver recetas y fórmulas de extrusión.' },
  { code: 'extrusion.formulas.manage', name: 'Administrar Fórmulas', module: 'Extrusión', description: 'Crear, editar o desactivar fórmulas.' },
  { code: 'extrusion.orders.view', name: 'Ver Órdenes Consumo', module: 'Extrusión', description: 'Ver órdenes de consumo a almacén.' },
  { code: 'extrusion.orders.create', name: 'Crear Órdenes Consumo', module: 'Extrusión', description: 'Solicitar material al almacén.' },
  { code: 'extrusion.wip.view', name: 'Ver Inventario WIP', module: 'Extrusión', description: 'Consultar material físico en piso de extrusión.' },
  { code: 'extrusion.wip.manage', name: 'Administrar WIP (Mezclar)', module: 'Extrusión', description: 'Generar lote de mezcla a partir de materias primas.' },
  { code: 'extrusion.runs.manage', name: 'Administrar Corridas', module: 'Extrusión', description: 'Iniciar corridas y generar PTI.' }
];

module.exports = {
  async up(queryInterface, Sequelize) {
    const timestamp = new Date();

    const existingPermissions = await queryInterface.sequelize.query(
      'SELECT code FROM permissions WHERE module = \'Extrusión\'',
      { type: Sequelize.QueryTypes.SELECT }
    );
    const existingCodes = existingPermissions.map(p => p.code);

    const newPermissions = EXTRUSION_PERMISSIONS
      .filter(p => !existingCodes.includes(p.code))
      .map(p => ({
        ...p,
        created_at: timestamp,
        updated_at: timestamp,
      }));

    if (newPermissions.length > 0) {
      await queryInterface.bulkInsert('permissions', newPermissions);
    }

    const allExtrusionPerms = await queryInterface.sequelize.query(
      'SELECT id FROM permissions WHERE module = \'Extrusión\'',
      { type: Sequelize.QueryTypes.SELECT }
    );
    const permIds = allExtrusionPerms.map(p => p.id);

    if (permIds.length > 0) {
      const globalRoles = await queryInterface.sequelize.query(
        'SELECT id FROM roles WHERE code IN (\'SUPERADMIN\', \'ADMIN_GENERAL\')',
        { type: Sequelize.QueryTypes.SELECT }
      );

      const rolePermissions = [];
      for (const role of globalRoles) {
        for (const permId of permIds) {
          rolePermissions.push({
            role_id: role.id,
            permission_id: permId,
            created_at: timestamp,
            updated_at: timestamp
          });
        }
      }

      for (const rp of rolePermissions) {
        await queryInterface.sequelize.query(
          `INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at) 
           SELECT ${rp.role_id}, ${rp.permission_id}, NOW(), NOW() 
           WHERE NOT EXISTS (SELECT 1 FROM role_permissions WHERE role_id = ${rp.role_id} AND permission_id = ${rp.permission_id})`
        );
      }
    }
  },

  async down(queryInterface, Sequelize) {
    const codes = EXTRUSION_PERMISSIONS.map(p => p.code);
    
    const perms = await queryInterface.sequelize.query(
      `SELECT id FROM permissions WHERE code IN (${codes.map(c => `'${c}'`).join(',')})`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    if (perms.length > 0) {
      const ids = perms.map(p => p.id).join(',');
      await queryInterface.sequelize.query(`DELETE FROM role_permissions WHERE permission_id IN (${ids})`);
      await queryInterface.sequelize.query(`DELETE FROM permissions WHERE id IN (${ids})`);
    }
  }
};
