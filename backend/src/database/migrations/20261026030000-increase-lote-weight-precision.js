'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('lotes', 'initial_amount', {
      type: Sequelize.DECIMAL(12, 3),
      allowNull: false,
    });
    await queryInterface.changeColumn('lotes', 'available_amount', {
      type: Sequelize.DECIMAL(12, 3),
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('lotes', 'initial_amount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
    });
    await queryInterface.changeColumn('lotes', 'available_amount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
    });
  },
};
