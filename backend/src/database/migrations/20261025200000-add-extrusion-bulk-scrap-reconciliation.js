'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        ALTER TABLE extrusion_scrap_logs
          ADD COLUMN IF NOT EXISTS actual_weight_method VARCHAR(32) NOT NULL DEFAULT 'PESAJE_DIRECTO',
          ADD COLUMN IF NOT EXISTS shift_closure_id INTEGER REFERENCES extrusion_shift_closures(id) ON UPDATE CASCADE ON DELETE SET NULL;

        CREATE INDEX IF NOT EXISTS idx_extrusion_scrap_shift_closure
          ON extrusion_scrap_logs (shift_closure_id);
      `, { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        DROP INDEX IF EXISTS idx_extrusion_scrap_shift_closure;
        ALTER TABLE extrusion_scrap_logs
          DROP COLUMN IF EXISTS shift_closure_id,
          DROP COLUMN IF EXISTS actual_weight_method;
      `, { transaction });
    });
  },
};
