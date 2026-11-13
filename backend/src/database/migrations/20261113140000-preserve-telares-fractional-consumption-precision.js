'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        ALTER TABLE looms
          ALTER COLUMN current_spools_count TYPE DECIMAL(10,3) USING current_spools_count::DECIMAL(10,3),
          ALTER COLUMN current_wip_kg TYPE DECIMAL(10,3) USING current_wip_kg::DECIMAL(10,3);

        ALTER TABLE loom_pti_wip_items
          ALTER COLUMN quantity_received_spools TYPE DECIMAL(12,3) USING quantity_received_spools::DECIMAL(12,3),
          ALTER COLUMN quantity_remaining_spools TYPE DECIMAL(12,3) USING quantity_remaining_spools::DECIMAL(12,3);

        ALTER TABLE loom_backflush_consumptions
          ALTER COLUMN theoretical_kg TYPE DECIMAL(10,3) USING theoretical_kg::DECIMAL(10,3),
          ALTER COLUMN spools_consumed TYPE DECIMAL(10,3) USING spools_consumed::DECIMAL(10,3),
          ALTER COLUMN rack_balance_spools_before TYPE DECIMAL(10,3) USING rack_balance_spools_before::DECIMAL(10,3),
          ALTER COLUMN rack_balance_spools_after TYPE DECIMAL(10,3) USING rack_balance_spools_after::DECIMAL(10,3);
      `, { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        ALTER TABLE loom_backflush_consumptions
          ALTER COLUMN theoretical_kg TYPE DECIMAL(10,2) USING theoretical_kg::DECIMAL(10,2),
          ALTER COLUMN spools_consumed TYPE DECIMAL(10,2) USING spools_consumed::DECIMAL(10,2),
          ALTER COLUMN rack_balance_spools_before TYPE DECIMAL(10,2) USING rack_balance_spools_before::DECIMAL(10,2),
          ALTER COLUMN rack_balance_spools_after TYPE DECIMAL(10,2) USING rack_balance_spools_after::DECIMAL(10,2);

        ALTER TABLE loom_pti_wip_items
          ALTER COLUMN quantity_received_spools TYPE DECIMAL(12,2) USING quantity_received_spools::DECIMAL(12,2),
          ALTER COLUMN quantity_remaining_spools TYPE DECIMAL(12,2) USING quantity_remaining_spools::DECIMAL(12,2);

        ALTER TABLE looms
          ALTER COLUMN current_spools_count TYPE DECIMAL(10,2) USING current_spools_count::DECIMAL(10,2),
          ALTER COLUMN current_wip_kg TYPE DECIMAL(10,2) USING current_wip_kg::DECIMAL(10,2);
      `, { transaction });
    });
  },
};
