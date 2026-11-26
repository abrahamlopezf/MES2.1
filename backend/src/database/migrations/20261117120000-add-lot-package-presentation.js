'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('lotes', 'presentation_quantity', {
      type: Sequelize.DECIMAL(12, 3),
      allowNull: true,
      comment: 'Quantity per invoice package, in the material base unit.',
    });
    await queryInterface.addColumn('lotes', 'presentation_unit', {
      type: Sequelize.STRING(20),
      allowNull: true,
      comment: 'Material base unit captured with the invoice package presentation.',
    });
    await queryInterface.addColumn('silo_receipt_lots', 'presentation_quantity', {
      type: Sequelize.DECIMAL(12, 3), allowNull: true,
      comment: 'Quantity per invoice package, in the material base unit.',
    });
    await queryInterface.addColumn('silo_receipt_lots', 'presentation_unit', {
      type: Sequelize.STRING(20), allowNull: true,
      comment: 'Material base unit captured with the invoice package presentation.',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('silo_receipt_lots', 'presentation_unit');
    await queryInterface.removeColumn('silo_receipt_lots', 'presentation_quantity');
    await queryInterface.removeColumn('lotes', 'presentation_unit');
    await queryInterface.removeColumn('lotes', 'presentation_quantity');
  },
};
