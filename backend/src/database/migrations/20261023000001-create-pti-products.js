'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS pti_products (
        id SERIAL PRIMARY KEY,
        code VARCHAR(60) NOT NULL UNIQUE,
        name VARCHAR(150) NOT NULL,
        specifications TEXT,
        unit_weight_kg DECIMAL(10,3) NOT NULL DEFAULT 6.800,
        unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        formula_id INTEGER REFERENCES formulas(id) ON UPDATE CASCADE ON DELETE SET NULL,
        material_id INTEGER REFERENCES materials(id) ON UPDATE CASCADE ON DELETE SET NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_pti_products_formula_id
        ON pti_products (formula_id);
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS pti_products;
    `);
  },
};
