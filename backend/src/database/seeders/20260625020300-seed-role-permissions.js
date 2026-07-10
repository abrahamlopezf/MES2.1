'use strict';

const { QueryTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    const roles = await queryInterface.sequelize.query(
      'SELECT id, code FROM roles;',
      { type: QueryTypes.SELECT }
    );

    const permissions = await queryInterface.sequelize.query(
      'SELECT id, code FROM permissions;',
      { type: QueryTypes.SELECT }
    );

    const roleMap = Object.fromEntries(roles.map((role) => [role.code, role.id]));
    const permissionMap = Object.fromEntries(
      permissions.map((permission) => [permission.code, permission.id])
    );

    const rolePermissions = {
      SUPERADMIN: [
        'dashboard.read',
        'users.create',
        'users.read',
        'users.update',
        'users.delete',
        'roles.create',
        'roles.read',
        'roles.update',
        'roles.delete',
        'areas.read',
        'reports.read',
        'reports.export',
        'charts.read',
        'operations.area.read',
        'operations.area.write',
      ],
      ADMIN: [
        'dashboard.read',
        'users.create',
        'users.read',
        'users.update',
        'users.delete',
        'roles.read',
        'areas.read',
        'reports.read',
        'reports.export',
        'charts.read',
        'operations.area.read',
        'operations.area.write',
      ],
      SUPERVISOR: [
        'dashboard.read',
        'areas.read',
        'reports.read',
        'charts.read',
        'operations.area.read',
        'operations.area.write',
      ],
      EMPLOYEE: [
        'dashboard.read',
        'areas.read',
        'operations.area.read',
        'operations.area.write',
      ],
      FINANCE: [
        'dashboard.read',
        'areas.read',
        'reports.read',
        'reports.export',
        'charts.read',
      ],
    };

    for (const [roleCode, permissionCodes] of Object.entries(rolePermissions)) {
      const roleId = roleMap[roleCode];

      for (const permissionCode of permissionCodes) {
        const permissionId = permissionMap[permissionCode];

        if (!roleId || !permissionId) continue;

        await queryInterface.sequelize.query(
          `
          INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
          VALUES (:roleId, :permissionId, NOW(), NOW())
          ON CONFLICT ON CONSTRAINT unique_role_permission
          DO NOTHING;
          `,
          {
            replacements: {
              roleId,
              permissionId,
            },
          }
        );
      }
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('role_permissions', null, {});
  },
};