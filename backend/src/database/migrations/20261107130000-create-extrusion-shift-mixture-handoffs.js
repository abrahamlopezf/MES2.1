'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE extrusion_shift_sessions
        ADD COLUMN IF NOT EXISTS handoff_ready_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS handoff_ready_by INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL;
      CREATE TABLE IF NOT EXISTS extrusion_shift_mixture_handoffs (
        id SERIAL PRIMARY KEY,
        from_shift_session_id INTEGER NOT NULL REFERENCES extrusion_shift_sessions(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        to_shift_session_id INTEGER REFERENCES extrusion_shift_sessions(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        extruder_id INTEGER NOT NULL REFERENCES extruders(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        queue_id INTEGER NOT NULL REFERENCES extruder_queues(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        process_preparation_id INTEGER REFERENCES process_preparations(id) ON UPDATE CASCADE ON DELETE SET NULL,
        mixture_qr VARCHAR(120) NOT NULL,
        formula_id INTEGER REFERENCES formulas(id) ON UPDATE CASCADE ON DELETE SET NULL,
        pti_color VARCHAR(240),
        remaining_balance_kg DECIMAL(12,3) NOT NULL CHECK (remaining_balance_kg >= 0),
        status VARCHAR(20) NOT NULL DEFAULT 'RECIBIDO' CHECK (status IN ('RECIBIDO', 'SIN_REMANENTE')),
        balance_captured_by INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
        balance_captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        accepted_by INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
        accepted_at TIMESTAMPTZ,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_extrusion_handoff_destination
        ON extrusion_shift_mixture_handoffs (to_shift_session_id, status);
      CREATE INDEX IF NOT EXISTS idx_extrusion_handoff_source
        ON extrusion_shift_mixture_handoffs (from_shift_session_id, extruder_id);
    `);
  },
  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_extrusion_handoff_source;
      DROP INDEX IF EXISTS idx_extrusion_handoff_destination;
      DROP TABLE IF EXISTS extrusion_shift_mixture_handoffs;
      ALTER TABLE extrusion_shift_sessions
        DROP COLUMN IF EXISTS handoff_ready_by,
        DROP COLUMN IF EXISTS handoff_ready_at;
    `);
  },
};
