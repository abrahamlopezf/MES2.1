'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE viajero_rolls
        ADD COLUMN IF NOT EXISTS shift_supervisor_id INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL;

      CREATE TABLE IF NOT EXISTS viajero_roll_operator_segments (
        id SERIAL PRIMARY KEY,
        viajero_roll_id INTEGER NOT NULL REFERENCES viajero_rolls(id) ON UPDATE CASCADE ON DELETE CASCADE,
        operator_id INTEGER NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        shift_number INTEGER NOT NULL,
        meters_start DECIMAL(12,2) NOT NULL,
        meters_end DECIMAL(12,2) NOT NULL,
        weight_start_kg DECIMAL(12,3),
        weight_end_kg DECIMAL(12,3),
        notes TEXT,
        recorded_by INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_viajero_roll_operator_segments_roll
        ON viajero_roll_operator_segments (viajero_roll_id);
      CREATE INDEX IF NOT EXISTS idx_viajero_roll_operator_segments_operator_shift
        ON viajero_roll_operator_segments (operator_id, shift_number);
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('viajero_roll_operator_segments');
    await queryInterface.removeColumn('viajero_rolls', 'shift_supervisor_id');
  },
};
