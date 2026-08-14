'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1. Ensure new permissions exist
      const newPermissions = [
        { code: 'global.dashboard.view', module: 'System', description: 'View global dashboard' },
        { code: 'global.reports.view', module: 'System', description: 'View global reports' },
        { code: 'warehouse.dashboard.view', module: 'Warehouse', description: 'View warehouse dashboard' },
        { code: 'warehouse.reports.view', module: 'Warehouse', description: 'View warehouse reports' },
        { code: 'inventory.view', module: 'Warehouse', description: 'View inventory' },
        { code: 'warehouse.consume', module: 'Warehouse', description: 'Consume inventory' },
        { code: 'materials.create', module: 'Materials', description: 'Create materials' },
        { code: 'materials.update', module: 'Materials', description: 'Update materials' },
        { code: 'qr.create', module: 'QRCodes', description: 'Generate QRs' },
        { code: 'lotes.view', module: 'Warehouse', description: 'View lotes list' },
        { code: 'lotes.detail', module: 'Warehouse', description: 'View lotes detail' }
      ];

      for (const p of newPermissions) {
        await queryInterface.sequelize.query(
          `INSERT INTO permissions (code, name, module, description, created_at, updated_at)
           SELECT '${p.code}', '${p.description}', '${p.module}', '${p.description}', NOW(), NOW()
           WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = '${p.code}');`,
          { transaction }
        );
      }

      // 2. Ensure Roles exist
      const roles = [
        { code: 'ADMIN_GENERAL', name: 'Administrador General', description: 'Acceso global' },
        { code: 'ADMIN_ALM', name: 'Administrador de Almacén', description: 'Administración completa de Almacén' },
        { code: 'WAREHOUSEMAN', name: 'Almacenista', description: 'Operador de Almacén' }
      ];

      for (const r of roles) {
        await queryInterface.sequelize.query(
          `INSERT INTO roles (code, name, description, created_at, updated_at)
           SELECT '${r.code}', '${r.name}', '${r.description}', NOW(), NOW()
           WHERE NOT EXISTS (SELECT 1 FROM roles WHERE code = '${r.code}');`,
          { transaction }
        );
      }

      // 3. Get Role IDs
      const [roleRecords] = await queryInterface.sequelize.query('SELECT id, code FROM roles;', { transaction });
      const roleMap = roleRecords.reduce((acc, r) => ({ ...acc, [r.code]: r.id }), {});

      // 4. Get Permission IDs
      const [permRecords] = await queryInterface.sequelize.query('SELECT id, code FROM permissions;', { transaction });
      const permMap = permRecords.reduce((acc, p) => ({ ...acc, [p.code]: p.id }), {});

      // 5. Assign Permissions to Roles
      // WAREHOUSEMAN
      const warehousemanPerms = ['inventory.view', 'warehouse.consume', 'warehouse.dispose', 'warehouse.read'];
      for (const code of warehousemanPerms) {
        if (permMap[code]) {
          await queryInterface.sequelize.query(
            `INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
             SELECT ${roleMap['WAREHOUSEMAN']}, ${permMap[code]}, NOW(), NOW()
             WHERE NOT EXISTS (SELECT 1 FROM role_permissions WHERE role_id = ${roleMap['WAREHOUSEMAN']} AND permission_id = ${permMap[code]});`,
            { transaction }
          );
        }
      }

      // ADMIN_ALM
      const adminAlmPerms = [
        'inventory.view', 'warehouse.consume', 'warehouse.dispose', 'warehouse.read', 
        'lotes.view', 'lotes.detail', 'materials.create', 'materials.update', 'materials.read',
        'qr.create', 'qr.read', 'warehouse.dashboard.view', 'warehouse.reports.view'
      ];
      for (const code of adminAlmPerms) {
        if (permMap[code]) {
          await queryInterface.sequelize.query(
            `INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
             SELECT ${roleMap['ADMIN_ALM']}, ${permMap[code]}, NOW(), NOW()
             WHERE NOT EXISTS (SELECT 1 FROM role_permissions WHERE role_id = ${roleMap['ADMIN_ALM']} AND permission_id = ${permMap[code]});`,
            { transaction }
          );
        }
      }

      // ADMIN_GENERAL
      // Assign ALL permissions to ADMIN_GENERAL and SUPERADMIN
      const globalRoles = ['ADMIN_GENERAL', 'SUPERADMIN'];
      for (const roleCode of globalRoles) {
        if (roleMap[roleCode]) {
          for (const permId of Object.values(permMap)) {
            await queryInterface.sequelize.query(
              `INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
               SELECT ${roleMap[roleCode]}, ${permId}, NOW(), NOW()
               WHERE NOT EXISTS (SELECT 1 FROM role_permissions WHERE role_id = ${roleMap[roleCode]} AND permission_id = ${permId});`,
              { transaction }
            );
          }
        }
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Basic down function
  }
};
