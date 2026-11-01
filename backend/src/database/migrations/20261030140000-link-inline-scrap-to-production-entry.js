'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        ALTER TABLE extrusion_scrap_logs
          ADD COLUMN IF NOT EXISTS source_production_entry_id INTEGER;
      `, { transaction });
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_extrusion_scrap_source_production_entry
          ON extrusion_scrap_logs (source_production_entry_id)
          WHERE source_production_entry_id IS NOT NULL;
      `, { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        DROP INDEX IF EXISTS idx_extrusion_scrap_source_production_entry;
        ALTER TABLE extrusion_scrap_logs
          DROP COLUMN IF EXISTS source_production_entry_id;
      `, { transaction });
    });
  },
};
