'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
         SELECT r.id, p.id, NOW(), NOW()
         FROM roles r
         JOIN permissions p ON p.code = 'inventory.view'
         WHERE r.code = 'SUPERVISOR_EXTRUSION'
           AND NOT EXISTS (
             SELECT 1 FROM role_permissions rp
             WHERE rp.role_id = r.id AND rp.permission_id = p.id
           )`,
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `DELETE FROM role_permissions rp
       USING roles r, permissions p
       WHERE rp.role_id = r.id
         AND rp.permission_id = p.id
         AND r.code = 'SUPERVISOR_EXTRUSION'
         AND p.code = 'inventory.view'`
    );
  },
};
