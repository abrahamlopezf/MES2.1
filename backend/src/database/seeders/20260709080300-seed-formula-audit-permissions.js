'use strict';

const now = new Date();

const permissions = [
  {
    code: 'formulas.read',
    name: 'Ver fórmulas',
    module: 'Formulas',
    description: 'Permite consultar el catálogo de fórmulas de proceso.',
  },
  {
    code: 'formulas.manage',
    name: 'Gestionar fórmulas',
    module: 'Formulas',
    description: 'Permite crear, actualizar y desactivar fórmulas de proceso.',
  },
  {
    code: 'audit.read',
    name: 'Ver auditoría',
    module: 'Audit',
    description: 'Permite consultar historial de auditoría y contingencias.',
  },
  {
    code: 'audit.export',
    name: 'Exportar auditoría',
    module: 'Audit',
    description: 'Permite exportar registros de auditoría.',
  },
];

const privilegedRoleCodes = [
  'SUPERADMIN',
  'ADMIN',
  'MANAGER',
  'SUPERVISOR',
];

module.exports = {
  async up(queryInterface) {
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
          role_codes: privilegedRoleCodes,
          permission_codes: permissions.map((permission) => permission.code),
          created_at: now,
          updated_at: now,
        },
      }
    );
  },

  async down(queryInterface) {
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
          permission_codes: permissions.map((permission) => permission.code),
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
          permission_codes: permissions.map((permission) => permission.code),
        },
      }
    );
  },
};