'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE production_boms
        ADD COLUMN IF NOT EXISTS expected_output_quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
        ADD COLUMN IF NOT EXISTS expected_output_unit VARCHAR(20) NOT NULL DEFAULT 'ROLLO';

      ALTER TABLE production_bom_items
        ADD COLUMN IF NOT EXISTS required_quantity DECIMAL(10,3),
        ADD COLUMN IF NOT EXISTS required_unit VARCHAR(20) NOT NULL DEFAULT 'KG';
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE production_bom_items
        DROP COLUMN IF EXISTS required_quantity,
        DROP COLUMN IF EXISTS required_unit;
      ALTER TABLE production_boms
        DROP COLUMN IF EXISTS expected_output_quantity,
        DROP COLUMN IF EXISTS expected_output_unit;
    `);
  },
};
