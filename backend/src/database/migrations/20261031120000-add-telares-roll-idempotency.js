'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE viajero_rolls
        ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(64),
        ADD COLUMN IF NOT EXISTS idempotency_payload_hash VARCHAR(64);
      CREATE UNIQUE INDEX IF NOT EXISTS viajero_rolls_idempotency_key_uq
        ON viajero_rolls (idempotency_key)
        WHERE idempotency_key IS NOT NULL;
    `);
  },

  // Conservar las claves de solicitudes ya procesadas para mantener protección contra reintentos.
  down: async () => {},
};
