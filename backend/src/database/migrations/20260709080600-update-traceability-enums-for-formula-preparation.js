'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_traceable_items_item_type"
      ADD VALUE IF NOT EXISTS 'PREPARED_MIX';
    `);

    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_traceability_movements_movement_type"
      ADD VALUE IF NOT EXISTS 'PREPARACION_FORMULA';
    `);

    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_traceability_links_link_type"
      ADD VALUE IF NOT EXISTS 'PREPARACION_FORMULA';
    `);
  },

  async down() {
    // PostgreSQL no permite eliminar valores de ENUM de forma simple/segura.
    // Se deja vacío intencionalmente.
  },
};