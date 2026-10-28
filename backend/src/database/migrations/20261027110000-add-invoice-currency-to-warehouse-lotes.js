'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('lotes', 'invoice_currency', {
      type: Sequelize.STRING(3), allowNull: false, defaultValue: 'MXN',
    });
    await queryInterface.addColumn('lotes', 'invoice_unit_cost', {
      type: Sequelize.DECIMAL(12, 4), allowNull: true,
    });
    await queryInterface.addColumn('lotes', 'invoice_exchange_rate', {
      type: Sequelize.DECIMAL(12, 6), allowNull: true,
    });
    await queryInterface.addColumn('lotes', 'invoice_exchange_rate_date', {
      type: Sequelize.DATEONLY, allowNull: true,
    });
    await queryInterface.addColumn('lotes', 'invoice_exchange_rate_source', {
      type: Sequelize.STRING(120), allowNull: true,
    });

    // Backfill existing records as invoices denominated in MXN at their recorded cost.
    await queryInterface.sequelize.query(`UPDATE lotes
      SET invoice_unit_cost = unit_cost
      WHERE invoice_unit_cost IS NULL AND unit_cost IS NOT NULL`);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('lotes', 'invoice_exchange_rate_source');
    await queryInterface.removeColumn('lotes', 'invoice_exchange_rate_date');
    await queryInterface.removeColumn('lotes', 'invoice_exchange_rate');
    await queryInterface.removeColumn('lotes', 'invoice_unit_cost');
    await queryInterface.removeColumn('lotes', 'invoice_currency');
  },
};
