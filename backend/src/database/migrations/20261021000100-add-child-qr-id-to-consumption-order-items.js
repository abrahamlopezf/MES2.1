'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE consumption_order_items 
      ADD COLUMN IF NOT EXISTS child_qr_id INTEGER REFERENCES qr_codes(id) ON UPDATE CASCADE ON DELETE SET NULL;
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_consumption_order_items_child_qr_id 
      ON consumption_order_items (child_qr_id);
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE consumption_order_items 
      DROP COLUMN IF EXISTS child_qr_id;
    `);
  }
};
