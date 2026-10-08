'use strict';

/**
 * Idempotente: en producción (Neon) la tabla `tags` aún no existe cuando corre esta
 * migración (se crea en 20261008000000). Si no existe, se omite; la columna
 * `description` se incluye directamente al crear la tabla.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const [rows] = await queryInterface.sequelize.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tags'`
    );
    if (!rows.length) return;

    const desc = await queryInterface.describeTable('tags');
    if (desc.description) return;

    await queryInterface.addColumn('tags', 'description', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`ALTER TABLE IF EXISTS tags DROP COLUMN IF EXISTS description`);
  }
};
