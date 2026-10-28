'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn('lotes', 'invoice_date', {
        type: Sequelize.DATEONLY, allowNull: true,
      }, { transaction });
      await queryInterface.addColumn('lotes', 'invoice_unit_cost_mxn', {
        type: Sequelize.DECIMAL(12, 4), allowNull: true,
      }, { transaction });
      await queryInterface.addColumn('lotes', 'invoice_unit_cost_usd', {
        type: Sequelize.DECIMAL(12, 6), allowNull: true,
      }, { transaction });

      await queryInterface.sequelize.query(`UPDATE lotes
        SET invoice_date = COALESCE(invoice_date, date_received::date),
            invoice_unit_cost_mxn = COALESCE(invoice_unit_cost_mxn, unit_cost),
            invoice_unit_cost_usd = COALESCE(invoice_unit_cost_usd,
              CASE WHEN invoice_currency = 'USD' THEN invoice_unit_cost
                   WHEN invoice_exchange_rate > 0 THEN unit_cost / invoice_exchange_rate
                   ELSE NULL END)
        WHERE invoice_date IS NULL OR invoice_unit_cost_mxn IS NULL OR invoice_unit_cost_usd IS NULL`, { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('lotes', 'invoice_unit_cost_usd');
    await queryInterface.removeColumn('lotes', 'invoice_unit_cost_mxn');
    await queryInterface.removeColumn('lotes', 'invoice_date');
  },
};
