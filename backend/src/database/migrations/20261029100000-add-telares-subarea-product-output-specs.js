'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        ALTER TABLE production_boms
          ADD COLUMN IF NOT EXISTS subarea_id INTEGER,
          ADD COLUMN IF NOT EXISTS product_kind VARCHAR(30) NOT NULL DEFAULT 'ROLLO_TELA',
          ADD COLUMN IF NOT EXISTS output_color VARCHAR(100),
          ADD COLUMN IF NOT EXISTS output_width_value NUMERIC(10,2),
          ADD COLUMN IF NOT EXISTS output_width_unit VARCHAR(20) NOT NULL DEFAULT 'CM',
          ADD COLUMN IF NOT EXISTS output_denier INTEGER,
          ADD COLUMN IF NOT EXISTS tensile_strength_lb NUMERIC(10,2),
          ADD COLUMN IF NOT EXISTS units_per_pallet INTEGER,
          ADD COLUMN IF NOT EXISTS packaging_type VARCHAR(50),
          ADD COLUMN IF NOT EXISTS output_weight_kg NUMERIC(10,3),
          ADD COLUMN IF NOT EXISTS is_provisional BOOLEAN NOT NULL DEFAULT FALSE;

        ALTER TABLE viajero_rolls
          ADD COLUMN IF NOT EXISTS product_kind VARCHAR(30) NOT NULL DEFAULT 'ROLLO_TELA',
          ADD COLUMN IF NOT EXISTS output_product_name VARCHAR(150),
          ADD COLUMN IF NOT EXISTS output_color VARCHAR(100),
          ADD COLUMN IF NOT EXISTS output_width_value NUMERIC(10,2),
          ADD COLUMN IF NOT EXISTS output_width_unit VARCHAR(20),
          ADD COLUMN IF NOT EXISTS output_denier INTEGER,
          ADD COLUMN IF NOT EXISTS tensile_strength_lb NUMERIC(10,2),
          ADD COLUMN IF NOT EXISTS units_per_pallet INTEGER,
          ADD COLUMN IF NOT EXISTS packaging_type VARCHAR(50);

        DO $$
        DECLARE
          v_area_id INTEGER;
          v_roll_subarea_id INTEGER;
          v_band_subarea_id INTEGER;
        BEGIN
          SELECT id INTO v_area_id FROM areas WHERE code = 'TELARES' LIMIT 1;
          IF v_area_id IS NULL THEN
            RAISE EXCEPTION 'No existe el área TELARES para clasificar sus subáreas.';
          END IF;

          SELECT id INTO v_roll_subarea_id
          FROM subareas
          WHERE area_id = v_area_id AND (nomenclature = 'TR' OR lower(name) IN ('telares rollo', 'rollo')) AND deleted_at IS NULL
          ORDER BY id LIMIT 1;

          IF v_roll_subarea_id IS NULL THEN
            INSERT INTO subareas (area_id, name, nomenclature, is_active, created_at, updated_at)
            VALUES (v_area_id, 'Telares Rollo', 'TR', TRUE, NOW(), NOW())
            RETURNING id INTO v_roll_subarea_id;
          END IF;

          SELECT id INTO v_band_subarea_id
          FROM subareas
          WHERE area_id = v_area_id AND nomenclature = 'TB' AND deleted_at IS NULL
          ORDER BY id LIMIT 1;
          IF v_band_subarea_id IS NULL THEN
            INSERT INTO subareas (area_id, name, nomenclature, is_active, created_at, updated_at)
            VALUES (v_area_id, 'Telares Banda', 'TB', TRUE, NOW(), NOW())
            RETURNING id INTO v_band_subarea_id;
          END IF;

          -- La configuración confirmada por planta es 1–17 Rollo y 18–21 Banda.
          UPDATE looms
          SET subarea_id = v_roll_subarea_id, updated_at = NOW()
          WHERE loom_number BETWEEN 1 AND 17;
          UPDATE looms
          SET subarea_id = v_band_subarea_id, updated_at = NOW()
          WHERE loom_number BETWEEN 18 AND 21;

          UPDATE production_boms
          SET subarea_id = CASE WHEN EXISTS (
                SELECT 1 FROM production_bom_items i
                JOIN pti_products p ON p.id = i.pti_product_id
                WHERE i.bom_id = production_boms.id AND p.extrusion_machine_number = 1
              ) THEN v_band_subarea_id ELSE v_roll_subarea_id END,
              product_kind = CASE WHEN EXISTS (
                SELECT 1 FROM production_bom_items i
                JOIN pti_products p ON p.id = i.pti_product_id
                WHERE i.bom_id = production_boms.id AND p.extrusion_machine_number = 1
              ) THEN 'BANDA' ELSE 'ROLLO_TELA' END,
              updated_at = NOW();
        END $$;

        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'production_boms_subarea_id_fkey'
          ) THEN
            ALTER TABLE production_boms
              ADD CONSTRAINT production_boms_subarea_id_fkey
              FOREIGN KEY (subarea_id) REFERENCES subareas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
          END IF;
        END $$;
      `, { transaction });
    });
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        ALTER TABLE production_boms DROP CONSTRAINT IF EXISTS production_boms_subarea_id_fkey;
        ALTER TABLE production_boms
          DROP COLUMN IF EXISTS subarea_id,
          DROP COLUMN IF EXISTS product_kind,
          DROP COLUMN IF EXISTS output_color,
          DROP COLUMN IF EXISTS output_width_value,
          DROP COLUMN IF EXISTS output_width_unit,
          DROP COLUMN IF EXISTS output_denier,
          DROP COLUMN IF EXISTS tensile_strength_lb,
          DROP COLUMN IF EXISTS units_per_pallet,
          DROP COLUMN IF EXISTS packaging_type,
          DROP COLUMN IF EXISTS output_weight_kg,
          DROP COLUMN IF EXISTS is_provisional;
        ALTER TABLE viajero_rolls
          DROP COLUMN IF EXISTS product_kind,
          DROP COLUMN IF EXISTS output_product_name,
          DROP COLUMN IF EXISTS output_color,
          DROP COLUMN IF EXISTS output_width_value,
          DROP COLUMN IF EXISTS output_width_unit,
          DROP COLUMN IF EXISTS output_denier,
          DROP COLUMN IF EXISTS tensile_strength_lb,
          DROP COLUMN IF EXISTS units_per_pallet,
          DROP COLUMN IF EXISTS packaging_type;

        -- Se conserva la clasificación de telares y subárea para no perder los datos
        -- operativos que se hayan registrado después de aplicar la migración.
      `, { transaction });
    });
  },
};
