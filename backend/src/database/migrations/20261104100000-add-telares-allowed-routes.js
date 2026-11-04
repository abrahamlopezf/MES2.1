'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE production_boms
      ADD COLUMN IF NOT EXISTS allowed_routes JSONB;

      UPDATE production_boms
      SET allowed_routes = jsonb_build_array(default_route::jsonb)
      WHERE allowed_routes IS NULL;

      ALTER TABLE production_boms
      ALTER COLUMN allowed_routes SET DEFAULT '[]'::jsonb,
      ALTER COLUMN allowed_routes SET NOT NULL;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE production_boms
      DROP COLUMN IF EXISTS allowed_routes;
    `);
  },
};
