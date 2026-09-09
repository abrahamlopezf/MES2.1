'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Lotes: unit_cost, total_cost
    await queryInterface.addColumn('lotes', 'unit_cost', {
      type: Sequelize.DECIMAL(12, 4),
      allowNull: true,
    });
    await queryInterface.addColumn('lotes', 'total_cost', {
      type: Sequelize.DECIMAL(12, 4),
      allowNull: true,
    });

    // 2. InventoryMovements: unit_cost, total_cost
    await queryInterface.addColumn('inventory_movements', 'unit_cost', {
      type: Sequelize.DECIMAL(12, 4),
      allowNull: true,
    });
    await queryInterface.addColumn('inventory_movements', 'total_cost', {
      type: Sequelize.DECIMAL(12, 4),
      allowNull: true,
    });

    // 3. Users: session_token
    await queryInterface.addColumn('users', 'session_token', {
      type: Sequelize.UUID,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('lotes', 'unit_cost');
    await queryInterface.removeColumn('lotes', 'total_cost');
    await queryInterface.removeColumn('inventory_movements', 'unit_cost');
    await queryInterface.removeColumn('inventory_movements', 'total_cost');
    await queryInterface.removeColumn('users', 'session_token');
  }
};
