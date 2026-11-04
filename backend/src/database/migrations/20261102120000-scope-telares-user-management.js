'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
      SELECT r.id, p.id, NOW(), NOW()
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.code IN ('ADMIN_TELARES', 'ADMIN_TEL')
        AND p.code IN ('users.read', 'users.create', 'users.update')
      ON CONFLICT DO NOTHING;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DELETE FROM role_permissions rp
      USING roles r, permissions p
      WHERE rp.role_id = r.id
        AND rp.permission_id = p.id
        AND r.code IN ('ADMIN_TELARES', 'ADMIN_TEL')
        AND p.code IN ('users.read', 'users.create', 'users.update');
    `);
  },
};
