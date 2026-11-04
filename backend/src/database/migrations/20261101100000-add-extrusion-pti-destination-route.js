'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        ALTER TABLE pti_racks
          ADD COLUMN IF NOT EXISTS destination_route VARCHAR(24);
        ALTER TABLE extrusion_production_entries
          ADD COLUMN IF NOT EXISTS destination_route VARCHAR(24);
      `, { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        ALTER TABLE extrusion_production_entries DROP COLUMN IF EXISTS destination_route;
        ALTER TABLE pti_racks DROP COLUMN IF EXISTS destination_route;
      `, { transaction });
    });
  },
};
