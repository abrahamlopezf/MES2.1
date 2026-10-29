'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE silos
        ADD COLUMN IF NOT EXISTS alert_stock_kg DECIMAL(12,2) NOT NULL DEFAULT 10000.00,
        ADD COLUMN IF NOT EXISTS material_tag_id INTEGER;

      UPDATE silos
      SET alert_stock_kg = LEAST(
        COALESCE(capacity_kg, 40000),
        GREATEST(COALESCE(min_capacity_kg, 5000), COALESCE(alert_stock_kg, COALESCE(min_capacity_kg, 5000) * 2))
      );

      ALTER TABLE silos ALTER COLUMN current_lot_type DROP NOT NULL;
      ALTER TABLE silos ALTER COLUMN current_lot_type DROP DEFAULT;
      ALTER TABLE silos ALTER COLUMN current_stock_kg SET DEFAULT 0;
      ALTER TABLE silos ALTER COLUMN current_lot_number DROP DEFAULT;
      ALTER TABLE silos ALTER COLUMN unit_cost SET DEFAULT 0;

      ALTER TABLE silos ALTER COLUMN alert_stock_kg SET DEFAULT 10000.00;
      ALTER TABLE silos ALTER COLUMN alert_stock_kg SET NOT NULL;

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'silos_material_tag_id_fkey'
            AND conrelid = 'silos'::regclass
        ) THEN
          ALTER TABLE silos
            ADD CONSTRAINT silos_material_tag_id_fkey
            FOREIGN KEY (material_tag_id) REFERENCES tags(id)
            ON UPDATE CASCADE ON DELETE RESTRICT;
        END IF;

      END $$;

      CREATE INDEX IF NOT EXISTS idx_silos_material_tag_id ON silos(material_tag_id);

      DO $$
      DECLARE polypropylene_tag_id INTEGER;
      BEGIN
        SELECT id INTO polypropylene_tag_id
        FROM tags
        WHERE deleted_at IS NULL AND is_active = TRUE
          AND upper(trim(name)) IN ('PP', 'POLIPROPILENO')
        ORDER BY CASE WHEN upper(trim(name)) = 'POLIPROPILENO' THEN 0 ELSE 1 END, id
        LIMIT 1;

        IF polypropylene_tag_id IS NULL THEN
          INSERT INTO tags (name, color, description, is_active, created_at, updated_at)
          VALUES ('POLIPROPILENO', '#10b981', 'Identifica materiales de polipropileno permitidos en silos.', TRUE, NOW(), NOW())
          RETURNING id INTO polypropylene_tag_id;
        END IF;

        UPDATE silos
        SET material_tag_id = polypropylene_tag_id
        WHERE material_tag_id IS NULL AND is_active = TRUE;
      END $$;
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_silos_material_tag_id;
      ALTER TABLE silos DROP CONSTRAINT IF EXISTS silos_material_tag_id_fkey;
      ALTER TABLE silos DROP COLUMN IF EXISTS material_tag_id;
      ALTER TABLE silos DROP COLUMN IF EXISTS alert_stock_kg;
    `);
  },
};
