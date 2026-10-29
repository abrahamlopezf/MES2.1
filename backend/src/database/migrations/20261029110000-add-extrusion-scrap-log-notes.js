'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        ALTER TABLE extrusion_scrap_logs
          ADD COLUMN IF NOT EXISTS notes TEXT;
      `, { transaction });
    });
  },

  // Preserve any operator notes if this migration is rolled back manually.
  async down() {},
};
