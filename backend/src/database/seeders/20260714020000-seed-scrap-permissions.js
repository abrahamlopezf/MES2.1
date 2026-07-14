'use strict';

const now = new Date();

const permissions = [
  {
    code: 'scrap.view',
    name: 'Ver scrap',
    module: 'Scrap',
    description: 'Permite consultar el catálogo y los movimientos de contenedores de scrap.',
  },
  {
    code: 'scrap.create',
    name: 'Crear scrap',
    module: 'Scrap',
    description: 'Permite registrar la generación de scrap.',
  },
  {
    code: 'scrap.transfer',
    name: 'Transferir scrap',
    module: 'Scrap',
    description: 'Permite trasladar inventario entre contenedores de scrap.',
  },
  {
    code: 'scrap.recycle',
    name: 'Salida a reciclaje',
    module: 'Scrap',
    description: 'Permite registrar la salida definitiva a reciclaje.',
  },
  {
    code: 'scrap.manage',
    name: 'Gestionar scrap',
    module: 'Scrap',
    description: 'Permite ajustes de inventario y configuración de contenedores de scrap.',
  },
];

// Asignaciones solicitadas por el usuario
const superadminRoles = ['SUPERADMIN', 'ADMIN']; // Todos los permisos
const supervisorRoles = ['SUPERVISOR']; // view, create, transfer
const empleadoRoles = ['EMPLEADO']; // view, create

module.exports = {
  async up(queryInterface) {
    // Insertar permisos
    for (const permission of permissions) {
      await queryInterface.sequelize.query(
        `
        INSERT INTO permissions
          (code, name, module, description, created_at, updated_at)
        VALUES
          (:code, :name, :module, :description, :created_at, :updated_at)
        ON CONFLICT (code) DO NOTHING;
        `,
        {
          replacements: {
            ...permission,
            created_at: now,
            updated_at: now,
          },
        }
      );
    }

    // Función auxiliar para asignar permisos a roles
    const assignPermissions = async (roles, permissionCodes) => {
      await queryInterface.sequelize.query(
        `
        INSERT INTO role_permissions
          (role_id, permission_id, created_at, updated_at)
        SELECT
          r.id,
          p.id,
          :created_at,
          :updated_at
        FROM roles r
        CROSS JOIN permissions p
        WHERE r.code IN (:role_codes)
          AND p.code IN (:permission_codes)
        ON CONFLICT ON CONSTRAINT unique_role_permission DO NOTHING;
        `,
        {
          replacements: {
            role_codes: roles,
            permission_codes: permissionCodes,
            created_at: now,
            updated_at: now,
          },
        }
      );
    };

    // SUPERADMIN y ADMIN -> todos
    await assignPermissions(superadminRoles, permissions.map((p) => p.code));

    // SUPERVISOR -> view, create, transfer
    await assignPermissions(supervisorRoles, ['scrap.view', 'scrap.create', 'scrap.transfer']);

    // EMPLEADO -> view, create
    await assignPermissions(empleadoRoles, ['scrap.view', 'scrap.create']);
  },

  async down(queryInterface) {
    const allPermissionCodes = permissions.map((p) => p.code);

    await queryInterface.sequelize.query(
      `
      DELETE FROM role_permissions
      WHERE permission_id IN (
        SELECT id FROM permissions
        WHERE code IN (:permission_codes)
      );
      `,
      {
        replacements: {
          permission_codes: allPermissionCodes,
        },
      }
    );

    await queryInterface.sequelize.query(
      `
      DELETE FROM permissions
      WHERE code IN (:permission_codes);
      `,
      {
        replacements: {
          permission_codes: allPermissionCodes,
        },
      }
    );
  },
};
