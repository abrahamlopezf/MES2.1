'use strict';

const { QueryTypes } = require('sequelize');

const QR_PERMISSIONS = [
  {
    name: 'Ver códigos QR',
    code: 'qr.read',
    module: 'qr',
    description: 'Permite consultar códigos QR.',
  },
  {
    name: 'Generar códigos QR',
    code: 'qr.generate',
    module: 'qr',
    description: 'Permite generar lotes de códigos QR.',
  },
  {
    name: 'Asignar códigos QR',
    code: 'qr.assign',
    module: 'qr',
    description: 'Permite asignar códigos QR a áreas.',
  },
  {
    name: 'Cancelar códigos QR',
    code: 'qr.cancel',
    module: 'qr',
    description: 'Permite cancelar códigos QR no utilizados.',
  },
  {
    name: 'Ver eventos QR',
    code: 'qr.events.read',
    module: 'qr',
    description: 'Permite consultar el historial de eventos de códigos QR.',
  },
];

const ROLE_PERMISSION_MAP = {
  SUPERADMIN: [
    'qr.read',
    'qr.generate',
    'qr.assign',
    'qr.cancel',
    'qr.events.read',
  ],
  ADMIN: [
    'qr.read',
    'qr.generate',
    'qr.assign',
    'qr.cancel',
    'qr.events.read',
  ],
  SUPERVISOR: [
    'qr.read',
    'qr.generate',
    'qr.assign',
    'qr.events.read',
  ],
  EMPLOYEE: [
    'qr.read',
    'qr.events.read',
  ],
  FINANCE: [
    'qr.read',
    'qr.events.read',
  ],
};

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const permissionCodes = QR_PERMISSIONS.map((permission) => permission.code);

    const existingPermissions = await queryInterface.sequelize.query(
      'SELECT id, code FROM permissions WHERE code IN (:codes)',
      {
        replacements: {
          codes: permissionCodes,
        },
        type: QueryTypes.SELECT,
      }
    );

    const existingCodes = existingPermissions.map((permission) => permission.code);

    const missingPermissions = QR_PERMISSIONS.filter(
      (permission) => !existingCodes.includes(permission.code)
    );

    if (missingPermissions.length > 0) {
      await queryInterface.bulkInsert(
        'permissions',
        missingPermissions.map((permission) => ({
          name: permission.name,
          code: permission.code,
          module: permission.module,
          description: permission.description,
          created_at: now,
          updated_at: now,
        }))
      );
    }

    const permissions = await queryInterface.sequelize.query(
      'SELECT id, code FROM permissions WHERE code IN (:codes)',
      {
        replacements: {
          codes: permissionCodes,
        },
        type: QueryTypes.SELECT,
      }
    );

    const roles = await queryInterface.sequelize.query(
      'SELECT id, code FROM roles WHERE code IN (:codes)',
      {
        replacements: {
          codes: Object.keys(ROLE_PERMISSION_MAP),
        },
        type: QueryTypes.SELECT,
      }
    );

    const rolePermissionRows = [];

    roles.forEach((role) => {
      const rolePermissionCodes = ROLE_PERMISSION_MAP[role.code] || [];

      rolePermissionCodes.forEach((permissionCode) => {
        const permission = permissions.find((item) => item.code === permissionCode);

        if (permission) {
          rolePermissionRows.push({
            role_id: role.id,
            permission_id: permission.id,
            created_at: now,
            updated_at: now,
          });
        }
      });
    });

    if (rolePermissionRows.length === 0) return;

    const existingRolePermissions = await queryInterface.sequelize.query(
      `
        SELECT role_id, permission_id
        FROM role_permissions
        WHERE role_id IN (:roleIds)
        AND permission_id IN (:permissionIds)
      `,
      {
        replacements: {
          roleIds: roles.map((role) => role.id),
          permissionIds: permissions.map((permission) => permission.id),
        },
        type: QueryTypes.SELECT,
      }
    );

    const existingMap = new Set(
      existingRolePermissions.map((item) => `${item.role_id}-${item.permission_id}`)
    );

    const missingRolePermissions = rolePermissionRows.filter(
      (item) => !existingMap.has(`${item.role_id}-${item.permission_id}`)
    );

    if (missingRolePermissions.length > 0) {
      await queryInterface.bulkInsert('role_permissions', missingRolePermissions);
    }
  },

  async down(queryInterface) {
    const permissionCodes = QR_PERMISSIONS.map((permission) => permission.code);

    const permissions = await queryInterface.sequelize.query(
      'SELECT id FROM permissions WHERE code IN (:codes)',
      {
        replacements: {
          codes: permissionCodes,
        },
        type: QueryTypes.SELECT,
      }
    );

    if (permissions.length > 0) {
      await queryInterface.bulkDelete('role_permissions', {
        permission_id: permissions.map((permission) => permission.id),
      });
    }

    await queryInterface.bulkDelete('permissions', {
      code: permissionCodes,
    });
  },
};