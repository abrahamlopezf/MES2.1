'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE extruder_queues
        ADD COLUMN IF NOT EXISTS mixture_balance_initial_kg DECIMAL(14,3);
      ALTER TABLE extrusion_shift_closures
        ADD COLUMN IF NOT EXISTS mass_balance_snapshot JSONB;
    `);
  },
  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE extrusion_shift_closures DROP COLUMN IF EXISTS mass_balance_snapshot;
      ALTER TABLE extruder_queues DROP COLUMN IF EXISTS mixture_balance_initial_kg;
    `);
  },
};
