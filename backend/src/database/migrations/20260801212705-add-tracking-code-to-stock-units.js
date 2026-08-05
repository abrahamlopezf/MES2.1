'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add tracking_code column to store the expanded nomenclature (ALM-FAM-ART-Hex)
    await queryInterface.addColumn('stock_units', 'tracking_code', {
      type: Sequelize.STRING(150),
      allowNull: true,
      comment: 'Expanded nomenclature generated at reception time',
    });
    
    // We should make it searchable, so let's add an index
    await queryInterface.addIndex('stock_units', ['tracking_code'], {
      name: 'idx_stock_units_tracking_code',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('stock_units', 'idx_stock_units_tracking_code');
    await queryInterface.removeColumn('stock_units', 'tracking_code');
  }
};
