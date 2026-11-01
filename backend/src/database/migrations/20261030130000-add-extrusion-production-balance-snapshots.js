'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        ALTER TABLE extrusion_production_entries
          ADD COLUMN IF NOT EXISTS mixture_consumed_kg NUMERIC(12, 3),
          ADD COLUMN IF NOT EXISTS standard_unit_weight_kg NUMERIC(12, 6),
          ADD COLUMN IF NOT EXISTS mixture_balance_before_kg NUMERIC(12, 3),
          ADD COLUMN IF NOT EXISTS mixture_balance_after_kg NUMERIC(12, 3);
      `, { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        ALTER TABLE extrusion_production_entries
          DROP COLUMN IF EXISTS mixture_balance_after_kg,
          DROP COLUMN IF EXISTS mixture_balance_before_kg,
          DROP COLUMN IF EXISTS standard_unit_weight_kg,
          DROP COLUMN IF EXISTS mixture_consumed_kg;
      `, { transaction });
    });
  },
};
