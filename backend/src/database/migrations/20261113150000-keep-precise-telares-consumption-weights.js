'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE loom_backflush_consumptions
        ALTER COLUMN theoretical_kg TYPE DECIMAL(14,6)
        USING theoretical_kg::DECIMAL(14,6);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE loom_backflush_consumptions
        ALTER COLUMN theoretical_kg TYPE DECIMAL(10,3)
        USING theoretical_kg::DECIMAL(10,3);
    `);
  },
};
