'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        ALTER TABLE corte_laminado_orders
          ADD COLUMN IF NOT EXISTS target_specification_id INTEGER NULL REFERENCES laminado_specifications(id) ON DELETE SET NULL,
          ADD COLUMN IF NOT EXISTS requested_roll_count INTEGER NULL;
        ALTER TABLE corte_laminado_order_items ALTER COLUMN roll_id DROP NOT NULL;
        UPDATE corte_laminado_orders o
        SET requested_roll_count = (
          SELECT COUNT(*) FROM corte_laminado_order_items i WHERE i.order_id = o.id
        )
        WHERE requested_roll_count IS NULL;
      `, { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        DO $$ BEGIN
          IF EXISTS (SELECT 1 FROM corte_laminado_order_items WHERE roll_id IS NULL) THEN
            RAISE EXCEPTION 'Cannot rollback Laminado demand while an order still has unassigned roll slots.';
          END IF;
        END $$;
        ALTER TABLE corte_laminado_order_items ALTER COLUMN roll_id SET NOT NULL;
        ALTER TABLE corte_laminado_orders
          DROP COLUMN IF EXISTS requested_roll_count,
          DROP COLUMN IF EXISTS target_specification_id;
      `, { transaction });
    });
  },
};
