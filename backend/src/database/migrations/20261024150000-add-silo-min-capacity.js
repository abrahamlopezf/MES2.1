'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE silos 
      ADD COLUMN IF NOT EXISTS min_capacity_kg DECIMAL(12, 2) NOT NULL DEFAULT 5000.00;

      -- Actualizar silos existentes con capacidades mínimas razonables
      UPDATE silos 
      SET min_capacity_kg = 5000.00 
      WHERE min_capacity_kg IS NULL OR min_capacity_kg = 0;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE silos DROP COLUMN IF EXISTS min_capacity_kg;
    `);
  }
};
