'use strict';

module.exports = {
  up: async (queryInterface) => {
    // Keep the material table aligned with the active model. These fields
    // already exist in the deployed database, so this is a no-op there.
    await queryInterface.sequelize.query(`
      ALTER TABLE materials ADD COLUMN IF NOT EXISTS ranking_id INTEGER;
      ALTER TABLE materials ADD COLUMN IF NOT EXISTS default_location_id INTEGER;
    `);
  },
  // Preserve material catalog data during rollback.
  down: async () => {}
};
