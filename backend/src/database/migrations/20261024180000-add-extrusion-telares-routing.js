'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        ALTER TABLE pti_racks
          ADD COLUMN IF NOT EXISTS destination_subarea_id INTEGER REFERENCES subareas(id) ON UPDATE CASCADE ON DELETE SET NULL;
        ALTER TABLE looms
          ADD COLUMN IF NOT EXISTS subarea_id INTEGER REFERENCES subareas(id) ON UPDATE CASCADE ON DELETE SET NULL;
        ALTER TABLE extrusion_production_entries
          ADD COLUMN IF NOT EXISTS destination_subarea_id INTEGER REFERENCES subareas(id) ON UPDATE CASCADE ON DELETE SET NULL;
        ALTER TABLE extrusion_shift_closures
          ADD COLUMN IF NOT EXISTS estimated_scrap_cost DECIMAL(14,4) NOT NULL DEFAULT 0,
          ADD COLUMN IF NOT EXISTS actual_scrap_cost DECIMAL(14,4) NOT NULL DEFAULT 0,
          ADD COLUMN IF NOT EXISTS variance_cost DECIMAL(14,4) NOT NULL DEFAULT 0;
        ALTER TABLE extrusion_scrap_logs
          ADD COLUMN IF NOT EXISTS mixture_consumption_applied BOOLEAN NOT NULL DEFAULT false;
      `, { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        ALTER TABLE extrusion_production_entries DROP COLUMN IF EXISTS destination_subarea_id;
        ALTER TABLE looms DROP COLUMN IF EXISTS subarea_id;
        ALTER TABLE pti_racks DROP COLUMN IF EXISTS destination_subarea_id;
        ALTER TABLE extrusion_shift_closures
          DROP COLUMN IF EXISTS estimated_scrap_cost,
          DROP COLUMN IF EXISTS actual_scrap_cost,
          DROP COLUMN IF EXISTS variance_cost;
        ALTER TABLE extrusion_scrap_logs DROP COLUMN IF EXISTS mixture_consumption_applied;
      `, { transaction });
    });
  },
};
