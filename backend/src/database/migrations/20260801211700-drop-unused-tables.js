'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Drop tables in reverse order of dependencies
    
    // Process related
    await queryInterface.dropTable('process_output_items', { cascade: true }).catch(() => {});
    await queryInterface.dropTable('process_run_outputs', { cascade: true }).catch(() => {});
    await queryInterface.dropTable('process_run_inputs', { cascade: true }).catch(() => {});
    await queryInterface.dropTable('process_runs', { cascade: true }).catch(() => {});
    await queryInterface.dropTable('process_preparation_inputs', { cascade: true }).catch(() => {});
    await queryInterface.dropTable('process_preparations', { cascade: true }).catch(() => {});
    await queryInterface.dropTable('process_formula_items', { cascade: true }).catch(() => {});
    await queryInterface.dropTable('process_formulas', { cascade: true }).catch(() => {});

    // Scrap related
    await queryInterface.dropTable('scrap_stock_movements', { cascade: true }).catch(() => {});
    await queryInterface.dropTable('scrap_container_stocks', { cascade: true }).catch(() => {});
    await queryInterface.dropTable('scrap_containers', { cascade: true }).catch(() => {});
    await queryInterface.dropTable('scrap_movements', { cascade: true }).catch(() => {});
    await queryInterface.dropTable('scrap_catalogs', { cascade: true }).catch(() => {});

    // Intermediate materials related
    await queryInterface.dropTable('intermediate_stock_movements', { cascade: true }).catch(() => {});
    await queryInterface.dropTable('intermediate_stocks', { cascade: true }).catch(() => {});
    await queryInterface.dropTable('storage_racks', { cascade: true }).catch(() => {});
    await queryInterface.dropTable('intermediate_materials', { cascade: true }).catch(() => {});
  },

  down: async (queryInterface, Sequelize) => {
    // Empty down function as restoring all these tables is complex and generally we don't rollback dropping deprecated features
  }
};
