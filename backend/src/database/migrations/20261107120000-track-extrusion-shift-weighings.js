'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE extrusion_transitions
        ADD COLUMN IF NOT EXISTS shift_session_id INTEGER REFERENCES extrusion_shift_sessions(id) ON UPDATE CASCADE ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS purge_weight_kg DECIMAL(12,3),
        ADD COLUMN IF NOT EXISTS purge_weighed_by INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS purge_weighed_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS remnant_weight_kg DECIMAL(12,3),
        ADD COLUMN IF NOT EXISTS remnant_weighed_by INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS remnant_weighed_at TIMESTAMPTZ;
      CREATE INDEX IF NOT EXISTS idx_extrusion_transitions_shift_session ON extrusion_transitions (shift_session_id, started_at);
    `);
  },
  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_extrusion_transitions_shift_session;
      ALTER TABLE extrusion_transitions
        DROP COLUMN IF EXISTS remnant_weighed_at,
        DROP COLUMN IF EXISTS remnant_weighed_by,
        DROP COLUMN IF EXISTS remnant_weight_kg,
        DROP COLUMN IF EXISTS purge_weighed_at,
        DROP COLUMN IF EXISTS purge_weighed_by,
        DROP COLUMN IF EXISTS purge_weight_kg,
        DROP COLUMN IF EXISTS shift_session_id;
    `);
  },
};
