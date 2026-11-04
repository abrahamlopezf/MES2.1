'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`ALTER TYPE "enum_traceability_movements_movement_type" ADD VALUE IF NOT EXISTS 'SALIDA_VENTA';`);
  },
  async down() {
    // PostgreSQL no permite quitar un valor de enum sin reconstruir el tipo.
  },
};
