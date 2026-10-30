'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE formula_ingredients
        ADD COLUMN IF NOT EXISTS equivalence_tag_id INTEGER;

      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'formula_ingredients_equivalence_tag_id_fkey'
            AND conrelid = 'formula_ingredients'::regclass
        ) THEN
          ALTER TABLE formula_ingredients
            ADD CONSTRAINT formula_ingredients_equivalence_tag_id_fkey
            FOREIGN KEY (equivalence_tag_id) REFERENCES tags(id)
            ON UPDATE CASCADE ON DELETE SET NULL;
        END IF;
      END $$;

      CREATE INDEX IF NOT EXISTS idx_formula_ingredients_equivalence_tag
        ON formula_ingredients (equivalence_tag_id)
        WHERE equivalence_tag_id IS NOT NULL;
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_formula_ingredients_equivalence_tag;
      ALTER TABLE formula_ingredients
        DROP CONSTRAINT IF EXISTS formula_ingredients_equivalence_tag_id_fkey,
        DROP COLUMN IF EXISTS equivalence_tag_id;
    `);
  },
};
