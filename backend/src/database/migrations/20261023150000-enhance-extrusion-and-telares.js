'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Permitir NULL en formula_id de pti_products (para PTIs aún no enlazados)
    await queryInterface.sequelize.query(`
      ALTER TABLE pti_products ALTER COLUMN formula_id DROP NOT NULL;
    `);

    // 2. Agregar output_pti_id a formulas
    await queryInterface.sequelize.query(`
      ALTER TABLE formulas 
      ADD COLUMN IF NOT EXISTS output_pti_id INTEGER REFERENCES pti_products(id) ON UPDATE CASCADE ON DELETE SET NULL;
    `);

    // 3. Agregar campo notes / especificaciones de exclusividad a extruders
    await queryInterface.sequelize.query(`
      ALTER TABLE extruders 
      ADD COLUMN IF NOT EXISTS notes TEXT;
    `);

    // 4. Agregar especificaciones y compatibilidades de PTI/Rollos a looms
    await queryInterface.sequelize.query(`
      ALTER TABLE looms 
      ADD COLUMN IF NOT EXISTS specifications TEXT,
      ADD COLUMN IF NOT EXISTS supported_pti_types JSON DEFAULT '[]'::json,
      ADD COLUMN IF NOT EXISTS supported_bom_ids JSON DEFAULT '[]'::json;
    `);

    // 5. Sincronizar output_pti_id inicial en formulas a partir de pti_products existentes
    await queryInterface.sequelize.query(`
      UPDATE formulas f
      SET output_pti_id = p.id
      FROM pti_products p
      WHERE p.formula_id = f.id AND f.output_pti_id IS NULL;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE looms 
      DROP COLUMN IF EXISTS specifications,
      DROP COLUMN IF EXISTS supported_pti_types,
      DROP COLUMN IF EXISTS supported_bom_ids;

      ALTER TABLE extruders 
      DROP COLUMN IF EXISTS notes;

      ALTER TABLE formulas 
      DROP COLUMN IF EXISTS output_pti_id;
    `);
  }
};
