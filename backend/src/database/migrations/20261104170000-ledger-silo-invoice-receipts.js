'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        ALTER TABLE inventory_movements
          ADD COLUMN IF NOT EXISTS source_audit_log_id BIGINT,
          ADD COLUMN IF NOT EXISTS source_reference VARCHAR(120);

        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_movements_source_audit_log_id_fkey') THEN
            ALTER TABLE inventory_movements ADD CONSTRAINT inventory_movements_source_audit_log_id_fkey
              FOREIGN KEY (source_audit_log_id) REFERENCES audit_logs(id) ON UPDATE CASCADE ON DELETE SET NULL;
          END IF;
        END $$;

        CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_movement_source_audit_reference
          ON inventory_movements (source_audit_log_id, source_reference)
          WHERE source_audit_log_id IS NOT NULL AND source_reference IS NOT NULL;

        WITH silo_receipts AS (
          SELECT a.id, CASE WHEN a.metadata->>'material_id' ~ '^[0-9]+$'
            THEN (a.metadata->>'material_id')::integer END AS material_id
          FROM audit_logs a WHERE a.action = 'SILO_MANUAL_RECEIPT'
        )
        INSERT INTO inventories (uuid, material_id, amount, created_at, updated_at)
        SELECT gen_random_uuid(), r.material_id, 0, NOW(), NOW()
        FROM silo_receipts r
        WHERE r.material_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM inventories i WHERE i.material_id = r.material_id)
        GROUP BY r.material_id;

        INSERT INTO inventory_movements (
          uuid, inventory_id, type, quantity_change, performed_by, notes,
          unit_cost, total_cost, silo_id, source_audit_log_id, source_reference,
          created_at, updated_at
        )
        SELECT
          gen_random_uuid(), i.id, 'SILO_ENTRY',
          CASE WHEN entry.value->>'quantity' ~ '^[0-9]+(\\.[0-9]+)?$'
            THEN (entry.value->>'quantity')::numeric END,
          COALESCE(a.user_id, (SELECT id FROM users ORDER BY id LIMIT 1)),
          CONCAT('Recepción histórica de PP en custodia de Almacén; factura ',
            COALESCE(NULLIF(entry.value->>'folio', ''), 'S/R'), '; silo ', s.code, '.'),
          CASE
            WHEN entry.value->>'invoice_unit_cost_mxn' ~ '^[0-9]+(\\.[0-9]+)?$' THEN (entry.value->>'invoice_unit_cost_mxn')::numeric
            WHEN entry.value->>'invoice_unit_cost' ~ '^[0-9]+(\\.[0-9]+)?$' THEN (entry.value->>'invoice_unit_cost')::numeric
            ELSE 0
          END,
          (CASE WHEN entry.value->>'quantity' ~ '^[0-9]+(\\.[0-9]+)?$'
            THEN (entry.value->>'quantity')::numeric ELSE 0 END) * CASE
              WHEN entry.value->>'invoice_unit_cost_mxn' ~ '^[0-9]+(\\.[0-9]+)?$' THEN (entry.value->>'invoice_unit_cost_mxn')::numeric
              WHEN entry.value->>'invoice_unit_cost' ~ '^[0-9]+(\\.[0-9]+)?$' THEN (entry.value->>'invoice_unit_cost')::numeric
              ELSE 0
            END,
          s.id, a.id,
          CONCAT(LEFT(COALESCE(NULLIF(entry.value->>'folio', ''), 'S-R'), 105), '#', entry.ordinality),
          a.created_at, a.created_at
        FROM audit_logs a
        JOIN silos s ON s.id::text = a.entity_id
        JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(a.metadata->'entries') = 'array'
          THEN a.metadata->'entries' ELSE '[]'::jsonb END) WITH ORDINALITY AS entry(value, ordinality) ON TRUE
        JOIN inventories i ON i.material_id = CASE WHEN a.metadata->>'material_id' ~ '^[0-9]+$'
          THEN (a.metadata->>'material_id')::integer END
        WHERE a.action = 'SILO_MANUAL_RECEIPT'
          AND a.metadata->>'material_id' ~ '^[0-9]+$'
          AND jsonb_typeof(a.metadata->'entries') = 'array'
          AND NULLIF(entry.value->>'quantity', '') ~ '^[0-9]+(\\.[0-9]+)?$'
          AND COALESCE(a.user_id, (SELECT id FROM users ORDER BY id LIMIT 1)) IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM inventory_movements existing
            WHERE existing.source_audit_log_id = a.id
              AND existing.source_reference = CONCAT(LEFT(COALESCE(NULLIF(entry.value->>'folio', ''), 'S-R'), 105), '#', entry.ordinality)
          );
      `, { transaction });
    });
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_inventory_movement_source_audit_reference;
      ALTER TABLE inventory_movements
        DROP CONSTRAINT IF EXISTS inventory_movements_source_audit_log_id_fkey,
        DROP COLUMN IF EXISTS source_reference,
        DROP COLUMN IF EXISTS source_audit_log_id;
    `);
  },
};
