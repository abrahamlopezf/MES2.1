'use strict';

const permissions = [
  { code: 'extrusion.view', name: 'Ver Extrusión', module: 'Extrusión', description: 'Ver el módulo y la operación de Extrusión.' },
  { code: 'extrusion.formulas.view', name: 'Ver Fórmulas de Extrusión', module: 'Extrusión', description: 'Consultar recetas y fórmulas de extrusión.' },
  { code: 'extrusion.formulas.manage', name: 'Administrar Fórmulas de Extrusión', module: 'Extrusión', description: 'Crear, editar o desactivar fórmulas de extrusión.' },
  { code: 'extrusion.orders.view', name: 'Ver Órdenes de Consumo de Extrusión', module: 'Extrusión', description: 'Consultar órdenes de consumo de Extrusión.' },
  { code: 'extrusion.orders.create', name: 'Crear Órdenes de Consumo de Extrusión', module: 'Extrusión', description: 'Solicitar materiales para Extrusión.' },
  { code: 'extrusion.wip.view', name: 'Ver Inventario WIP de Extrusión', module: 'Extrusión', description: 'Consultar el material físico en el piso de Extrusión.' },
  { code: 'extrusion.wip.manage', name: 'Administrar Mezclas de Extrusión', module: 'Extrusión', description: 'Preparar mezclas a partir de materias primas.' },
  { code: 'extrusion.runs.manage', name: 'Administrar Corridas de Extrusión', module: 'Extrusión', description: 'Administrar corridas e ingreso de PTI.' },
  { code: 'globo.view', name: 'Ver Globo', module: 'Globo', description: 'Acceder a la estación y consultar su operación.' },
  { code: 'globo.process', name: 'Procesar Rollos en Globo', module: 'Globo', description: 'Validar y registrar el procesamiento de rollos en Globo.' },
  { code: 'laminado.view', name: 'Ver Laminado', module: 'Laminado', description: 'Acceder a la estación y consultar su operación.' },
  { code: 'laminado.process', name: 'Procesar Rollos en Laminado', module: 'Laminado', description: 'Validar y registrar el procesamiento de rollos en Laminado.' },
];

module.exports = {
  async up(queryInterface) {
    for (const permission of permissions) {
      await queryInterface.sequelize.query(
        `INSERT INTO permissions (code, name, module, description, created_at, updated_at)
         VALUES (:code, :name, :module, :description, NOW(), NOW())
         ON CONFLICT (code) DO NOTHING;`,
        { replacements: permission }
      );
    }

    await queryInterface.sequelize.query(
      `INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
       SELECT r.id, p.id, NOW(), NOW()
       FROM roles r
       CROSS JOIN permissions p
       WHERE r.code IN ('SUPERADMIN', 'ADMIN_GENERAL', 'ADMIN_GRAL')
         AND p.code IN (:codes)
       ON CONFLICT ON CONSTRAINT unique_role_permission DO NOTHING;`,
      { replacements: { codes: permissions.map(({ code }) => code) } }
    );
  },

  // Permission records can already exist from earlier seeders and may be assigned
  // to user-managed roles, so rollback intentionally preserves this catalog data.
  async down() {},
};
