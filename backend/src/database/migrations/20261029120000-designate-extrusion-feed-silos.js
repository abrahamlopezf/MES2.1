'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE silos
        ADD COLUMN IF NOT EXISTS is_extrusion_feed BOOLEAN NOT NULL DEFAULT FALSE;

      -- The original catalog migration seeded four rows although the plant
      -- operates two feed silos. Preserve every row and its stock; designate
      -- only the two canonical silos for extrusion consumption by default.
      UPDATE silos
      SET is_extrusion_feed = (code IN ('SILO-01', 'SILO-02'))
      WHERE code IN ('SILO-01', 'SILO-02', 'SILO-03', 'SILO-04');

      CREATE INDEX IF NOT EXISTS idx_silos_extrusion_feed_active
        ON silos (is_active, is_extrusion_feed);
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_silos_extrusion_feed_active;
      ALTER TABLE silos DROP COLUMN IF EXISTS is_extrusion_feed;
    `);
  },
};
