'use strict';

module.exports = {
  up: async (queryInterface) => {
    // Backfill from the immutable output snapshot captured on the prepared
    // container. Never infer an old queue output from today's formula links.
    await queryInterface.sequelize.query(`
      WITH queue_container_output AS (
        SELECT q.id AS queue_id,
          MIN((ti.metadata->>'output_pti_product_id')::integer) AS pti_id,
          MIN(NULLIF(ti.metadata->>'output_pti_color', '')) AS output_color
        FROM extruder_queues q
        JOIN qr_codes qr ON qr.qr_code = q.consumption_order_qr_id
        JOIN traceable_items ti ON ti.qr_code_id = qr.id AND ti.item_type = 'PREPARED_MIX'
        WHERE ti.metadata->>'output_pti_product_id' ~ '^[0-9]+$'
        GROUP BY q.id
        HAVING COUNT(DISTINCT (ti.metadata->>'output_pti_product_id')::integer) = 1
      )
      UPDATE extruder_queues q
      SET output_pti_product_id = p.id,
          output_pti_color = COALESCE(o.output_color, p.color),
          updated_at = NOW()
      FROM queue_container_output o
      JOIN pti_products p ON p.id = o.pti_id
      WHERE q.id = o.queue_id
        AND q.output_pti_product_id IS NULL;
    `);
  },

  // This is a deterministic data backfill. Removing inferred snapshots on
  // rollback could erase operational records, so the down migration is a no-op.
  down: async () => {},
};
