'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE lotes
        ADD COLUMN IF NOT EXISTS invoice_currency VARCHAR(3) NOT NULL DEFAULT 'MXN',
        ADD COLUMN IF NOT EXISTS invoice_unit_cost DECIMAL(12,4),
        ADD COLUMN IF NOT EXISTS invoice_exchange_rate DECIMAL(12,6),
        ADD COLUMN IF NOT EXISTS invoice_exchange_rate_date DATE,
        ADD COLUMN IF NOT EXISTS invoice_exchange_rate_source VARCHAR(120);
    `);

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
