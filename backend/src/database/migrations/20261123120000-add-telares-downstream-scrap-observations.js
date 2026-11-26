'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        CREATE TABLE IF NOT EXISTS telares_scrap_observations (
          id BIGSERIAL PRIMARY KEY,
          viajero_roll_id INTEGER NOT NULL REFERENCES viajero_rolls(id) ON DELETE RESTRICT,
          source_qr_code_id INTEGER NOT NULL REFERENCES qr_codes(id) ON DELETE RESTRICT,
          destination_area_code VARCHAR(24) NOT NULL CHECK (destination_area_code IN ('LAMINADO', 'GLOBO')),
          detecting_area_id INTEGER NOT NULL REFERENCES areas(id) ON DELETE RESTRICT,
          meter_start NUMERIC(14,2) NOT NULL,
          meter_end NUMERIC(14,2) NOT NULL,
          scrap_meters NUMERIC(14,2) NOT NULL CHECK (scrap_meters > 0),
          estimated_weight_kg NUMERIC(14,3) NOT NULL CHECK (estimated_weight_kg >= 0),
          reason VARCHAR(120) NOT NULL,
          notes TEXT NULL,
          recorded_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          CONSTRAINT telares_scrap_observation_range_valid CHECK (meter_start >= 0 AND meter_end > meter_start),
          CONSTRAINT telares_scrap_observation_range_length CHECK (ABS((meter_end - meter_start) - scrap_meters) <= 0.02)
        );
        CREATE INDEX IF NOT EXISTS telares_scrap_observations_roll_idx ON telares_scrap_observations(viajero_roll_id, meter_start, meter_end);
        CREATE INDEX IF NOT EXISTS telares_scrap_observations_area_idx ON telares_scrap_observations(destination_area_code, created_at DESC);
      `, { transaction });
    });
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS telares_scrap_observations;');
  },
};
