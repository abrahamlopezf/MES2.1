'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE globo_specifications
        ADD COLUMN IF NOT EXISTS output_pti_code VARCHAR(50),
        ADD COLUMN IF NOT EXISTS configuration_status VARCHAR(16) NOT NULL DEFAULT 'BORRADOR';
      ALTER TABLE laminado_specifications
        ADD COLUMN IF NOT EXISTS output_pti_code VARCHAR(50),
        ADD COLUMN IF NOT EXISTS configuration_status VARCHAR(16) NOT NULL DEFAULT 'BORRADOR';

      UPDATE globo_specifications SET is_active = FALSE WHERE output_pti_code IS NULL OR BTRIM(output_pti_code) = '';
      UPDATE laminado_specifications SET is_active = FALSE WHERE output_pti_code IS NULL OR BTRIM(output_pti_code) = '';
      UPDATE globo_specifications SET configuration_status = CASE WHEN is_active THEN 'ACTIVA' ELSE 'BORRADOR' END;
      UPDATE laminado_specifications SET configuration_status = CASE WHEN is_active THEN 'ACTIVA' ELSE 'BORRADOR' END;

      ALTER TABLE globo_specifications
        ALTER COLUMN process_type DROP NOT NULL,
        ALTER COLUMN process_type DROP DEFAULT,
        ALTER COLUMN target_width_cm DROP NOT NULL,
        ALTER COLUMN target_width_cm DROP DEFAULT,
        ALTER COLUMN target_grammage_g_per_m DROP NOT NULL,
        ALTER COLUMN target_grammage_g_per_m DROP DEFAULT,
        ALTER COLUMN expected_output_quantity DROP NOT NULL,
        ALTER COLUMN expected_output_quantity DROP DEFAULT,
        ALTER COLUMN expected_output_unit DROP NOT NULL,
        ALTER COLUMN expected_output_unit DROP DEFAULT,
        ALTER COLUMN standard_output_meters DROP NOT NULL,
        ALTER COLUMN standard_output_meters DROP DEFAULT,
        ALTER COLUMN standard_waste_percentage DROP NOT NULL,
        ALTER COLUMN standard_waste_percentage DROP DEFAULT,
        ALTER COLUMN cost_transformation_index DROP NOT NULL,
        ALTER COLUMN cost_transformation_index DROP DEFAULT,
        ALTER COLUMN loom_roll_requirements SET DEFAULT '{}'::jsonb;
      ALTER TABLE laminado_specifications
        ALTER COLUMN lamination_type DROP NOT NULL,
        ALTER COLUMN lamination_type DROP DEFAULT,
        ALTER COLUMN target_width_cm DROP NOT NULL,
        ALTER COLUMN target_width_cm DROP DEFAULT,
        ALTER COLUMN coating_grammage_g_per_m2 DROP NOT NULL,
        ALTER COLUMN coating_grammage_g_per_m2 DROP DEFAULT,
        ALTER COLUMN expected_output_quantity DROP NOT NULL,
        ALTER COLUMN expected_output_quantity DROP DEFAULT,
        ALTER COLUMN expected_output_unit DROP NOT NULL,
        ALTER COLUMN expected_output_unit DROP DEFAULT,
        ALTER COLUMN standard_output_meters DROP NOT NULL,
        ALTER COLUMN standard_output_meters DROP DEFAULT,
        ALTER COLUMN standard_waste_percentage DROP NOT NULL,
        ALTER COLUMN standard_waste_percentage DROP DEFAULT,
        ALTER COLUMN cost_transformation_index DROP NOT NULL,
        ALTER COLUMN cost_transformation_index DROP DEFAULT,
        ALTER COLUMN loom_roll_requirements SET DEFAULT '{}'::jsonb;

      CREATE UNIQUE INDEX IF NOT EXISTS globo_output_pti_code_unique
        ON globo_specifications (UPPER(output_pti_code)) WHERE output_pti_code IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS laminado_output_pti_code_unique
        ON laminado_specifications (UPPER(output_pti_code)) WHERE output_pti_code IS NOT NULL;

      CREATE TABLE IF NOT EXISTS area_process_scrap_logs (
        id BIGSERIAL PRIMARY KEY,
        area_id INTEGER NOT NULL REFERENCES areas(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        viajero_roll_id INTEGER NOT NULL REFERENCES viajero_rolls(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        source_qr_code_id INTEGER NOT NULL REFERENCES qr_codes(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        output_qr_code_id INTEGER REFERENCES qr_codes(id) ON UPDATE CASCADE ON DELETE SET NULL,
        output_pti_code VARCHAR(50) NOT NULL,
        specification_code VARCHAR(50) NOT NULL,
        processed_meters DECIMAL(14,2) NOT NULL CHECK (processed_meters > 0),
        good_meters DECIMAL(14,2) NOT NULL CHECK (good_meters >= 0),
        scrap_meters DECIMAL(14,2) NOT NULL DEFAULT 0 CHECK (scrap_meters >= 0),
        good_weight_kg DECIMAL(14,3) NOT NULL CHECK (good_weight_kg >= 0),
        scrap_weight_kg DECIMAL(14,3) CHECK (scrap_weight_kg IS NULL OR scrap_weight_kg >= 0),
        reason VARCHAR(80),
        notes TEXT,
        recorded_by INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT area_process_scrap_meters_balance CHECK (ABS(processed_meters - good_meters - scrap_meters) <= 0.02),
        CONSTRAINT area_process_scrap_source_unique UNIQUE (area_id, source_qr_code_id)
      );
      CREATE INDEX IF NOT EXISTS area_process_scrap_logs_area_date_idx
        ON area_process_scrap_logs (area_id, created_at DESC);
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS area_process_scrap_logs;
      DROP INDEX IF EXISTS laminado_output_pti_code_unique;
      DROP INDEX IF EXISTS globo_output_pti_code_unique;
      ALTER TABLE globo_specifications
        DROP COLUMN IF EXISTS output_pti_code,
        DROP COLUMN IF EXISTS configuration_status;
      ALTER TABLE laminado_specifications
        DROP COLUMN IF EXISTS output_pti_code,
        DROP COLUMN IF EXISTS configuration_status;
    `);
  },
};
