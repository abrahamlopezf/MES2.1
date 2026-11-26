'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`ALTER TYPE "enum_traceable_items_status" ADD VALUE IF NOT EXISTS 'EN_TRANSITO';`);
    await queryInterface.sequelize.query(`ALTER TYPE "enum_traceable_items_status" ADD VALUE IF NOT EXISTS 'PENDIENTE_TRANSFERENCIA';`);
    await queryInterface.sequelize.query(`ALTER TYPE "enum_traceable_items_status" ADD VALUE IF NOT EXISTS 'PENDIENTE_VENTA';`);
    await queryInterface.sequelize.query(`ALTER TYPE "enum_traceability_movements_movement_type" ADD VALUE IF NOT EXISTS 'DESPACHO_TRANSFERENCIA';`);
    await queryInterface.sequelize.query(`ALTER TYPE "enum_traceability_movements_movement_type" ADD VALUE IF NOT EXISTS 'RECEPCION_TRANSFERENCIA';`);
    await queryInterface.sequelize.query(`
      ALTER TABLE corte_laminado_order_items
        ADD COLUMN IF NOT EXISTS dispatched_by INTEGER NULL,
        ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ NULL,
        ADD COLUMN IF NOT EXISTS received_by INTEGER NULL,
        ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ NULL;
      CREATE INDEX IF NOT EXISTS corte_laminado_items_transfer_queue_idx
        ON corte_laminado_order_items(status, updated_at DESC)
        WHERE status IN ('AWAITING_DISPATCH', 'IN_TRANSIT');
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS corte_laminado_items_transfer_queue_idx;
      ALTER TABLE corte_laminado_order_items
        DROP COLUMN IF EXISTS received_at,
        DROP COLUMN IF EXISTS received_by,
        DROP COLUMN IF EXISTS dispatched_at,
        DROP COLUMN IF EXISTS dispatched_by;
    `);
  },
};
