'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DELETE FROM role_permissions rp
      USING roles r, permissions p
      WHERE rp.role_id = r.id
        AND rp.permission_id = p.id
        AND r.code IN ('ADMIN_TELARES', 'ADMIN_GLOBO', 'SUPERVISOR_GLOBO', 'OPERADOR_GLOBO', 'ADMIN_LAMINADO', 'SUPERVISOR_LAMINADO', 'OPERADOR_LAMINADO')
        AND p.code IN ('globo.catalog.manage', 'globo.wip.view', 'laminado.catalog.manage', 'laminado.wip.view', 'globo.view', 'globo.process', 'laminado.view', 'laminado.process');

      INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
      SELECT r.id, p.id, NOW(), NOW()
      FROM roles r
      JOIN permissions p ON (
        (r.code = 'ADMIN_GLOBO' AND p.code IN ('globo.catalog.manage', 'globo.wip.view', 'globo.view', 'globo.process'))
        OR (r.code IN ('SUPERVISOR_GLOBO', 'OPERADOR_GLOBO') AND p.code IN ('globo.wip.view', 'globo.view', 'globo.process'))
        OR (r.code = 'ADMIN_LAMINADO' AND p.code IN ('laminado.catalog.manage', 'laminado.wip.view', 'laminado.view', 'laminado.process'))
        OR (r.code IN ('SUPERVISOR_LAMINADO', 'OPERADOR_LAMINADO') AND p.code IN ('laminado.wip.view', 'laminado.view', 'laminado.process'))
      )
      ON CONFLICT DO NOTHING;
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DELETE FROM role_permissions rp
      USING roles r, permissions p
      WHERE rp.role_id = r.id
        AND rp.permission_id = p.id
        AND r.code IN ('ADMIN_TELARES', 'ADMIN_GLOBO', 'SUPERVISOR_GLOBO', 'OPERADOR_GLOBO', 'ADMIN_LAMINADO', 'SUPERVISOR_LAMINADO', 'OPERADOR_LAMINADO')
        AND p.code IN ('globo.catalog.manage', 'globo.wip.view', 'laminado.catalog.manage', 'laminado.wip.view', 'globo.view', 'globo.process', 'laminado.view', 'laminado.process');

      INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
      SELECT r.id, p.id, NOW(), NOW()
      FROM roles r
      CROSS JOIN permissions p
      WHERE (r.code IN ('ADMIN_TELARES', 'ADMIN_GLOBO', 'ADMIN_LAMINADO')
             AND p.code IN ('globo.catalog.manage', 'globo.wip.view', 'laminado.catalog.manage', 'laminado.wip.view', 'globo.view', 'globo.process', 'laminado.view', 'laminado.process'))
         OR (r.code = 'SUPERVISOR_GLOBO' AND p.code IN ('globo.view', 'globo.wip.view'))
         OR (r.code = 'OPERADOR_GLOBO' AND p.code IN ('globo.view', 'globo.process', 'globo.wip.view'))
         OR (r.code = 'SUPERVISOR_LAMINADO' AND p.code IN ('laminado.view', 'laminado.wip.view'))
         OR (r.code = 'OPERADOR_LAMINADO' AND p.code IN ('laminado.view', 'laminado.process', 'laminado.wip.view'))
      ON CONFLICT DO NOTHING;
    `);
  },
};
