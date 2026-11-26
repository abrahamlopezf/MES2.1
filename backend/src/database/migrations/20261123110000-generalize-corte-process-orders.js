'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        ALTER TABLE corte_laminado_orders
          ADD COLUMN IF NOT EXISTS destination_area_code VARCHAR(24) NOT NULL DEFAULT 'LAMINADO',
          ADD COLUMN IF NOT EXISTS target_globo_specification_id INTEGER NULL REFERENCES globo_specifications(id) ON DELETE SET NULL,
          ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN NOT NULL DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS urgent_reason TEXT NULL;
        ALTER TABLE corte_laminado_order_items ALTER COLUMN roll_id DROP NOT NULL;
        UPDATE corte_laminado_orders SET destination_area_code = 'LAMINADO' WHERE destination_area_code IS NULL OR destination_area_code = '';
        CREATE INDEX IF NOT EXISTS corte_process_orders_queue_idx
          ON corte_laminado_orders(destination_area_code, is_urgent DESC, requested_at ASC, id ASC)
          WHERE status IN ('REQUESTED', 'PARTIALLY_PICKED');
      `, { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        DROP INDEX IF EXISTS corte_process_orders_queue_idx;
        ALTER TABLE corte_laminado_orders
          DROP COLUMN IF EXISTS urgent_reason,
          DROP COLUMN IF EXISTS is_urgent,
          DROP COLUMN IF EXISTS target_globo_specification_id,
          DROP COLUMN IF EXISTS destination_area_code;
      `, { transaction });
    });
  },
};
