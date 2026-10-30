'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE inventory_movements
        ADD COLUMN IF NOT EXISTS silo_id INTEGER,
        ADD COLUMN IF NOT EXISTS process_preparation_id INTEGER,
        ADD COLUMN IF NOT EXISTS process_preparation_input_id INTEGER;

      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_movements_silo_id_fkey') THEN
          ALTER TABLE inventory_movements ADD CONSTRAINT inventory_movements_silo_id_fkey
            FOREIGN KEY (silo_id) REFERENCES silos(id) ON UPDATE CASCADE ON DELETE SET NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_movements_process_preparation_id_fkey') THEN
          ALTER TABLE inventory_movements ADD CONSTRAINT inventory_movements_process_preparation_id_fkey
            FOREIGN KEY (process_preparation_id) REFERENCES process_preparations(id) ON UPDATE CASCADE ON DELETE SET NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_movements_process_preparation_input_id_fkey') THEN
          ALTER TABLE inventory_movements ADD CONSTRAINT inventory_movements_process_preparation_input_id_fkey
            FOREIGN KEY (process_preparation_input_id) REFERENCES process_preparation_inputs(id) ON UPDATE CASCADE ON DELETE SET NULL;
        END IF;
      END $$;

      CREATE INDEX IF NOT EXISTS idx_inventory_movements_silo_date
        ON inventory_movements (silo_id, created_at);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_movements_preparation_input
        ON inventory_movements (process_preparation_input_id)
        WHERE process_preparation_input_id IS NOT NULL;

      -- Keep the warehouse ledger queryable through its required inventory FK.
      -- Zero-balance rows do not increase warehouse on-hand stock; silo balances
      -- remain the source of truth for this PP.
      INSERT INTO inventories (uuid, material_id, amount, created_at, updated_at)
      SELECT gen_random_uuid(), ppi.material_id, 0, NOW(), NOW()
      FROM process_preparation_inputs ppi
      WHERE ppi.source_silo_id IS NOT NULL AND ppi.material_id IS NOT NULL
      ON CONFLICT (material_id) DO NOTHING;

      -- Backfill each historic silo deduction once so old mixtures also appear
      -- in Warehouse movement reports with their original operator and costs.
      INSERT INTO inventory_movements (
        uuid, inventory_id, type, quantity_change, performed_by, notes,
        unit_cost, total_cost, area_id, cost_treatment,
        silo_id, process_preparation_id, process_preparation_input_id,
        created_at, updated_at
      )
      SELECT
        gen_random_uuid(),
        inv.id,
        'CONSUMPTION',
        -ABS(ppi.quantity),
        COALESCE(prep.prepared_by, (SELECT id FROM users ORDER BY id LIMIT 1)),
        CONCAT('Consumo directo de PP desde silo ', s.code,
          '; preparación ', prep.folio,
          '; lote/factura ', COALESCE(ppi.source_lot_number, 'S/R'),
          '; mezcla ', COALESCE(prep.formula_snapshot->>'formula_code', prep.formula_id::text), '.'),
        ppi.unit_cost_snapshot,
        ppi.extended_cost_snapshot,
        prep.from_area_id,
        'WIP_TRANSFER',
        s.id,
        prep.id,
        ppi.id,
        COALESCE(ppi.created_at, prep.prepared_at, NOW()),
        COALESCE(ppi.created_at, prep.prepared_at, NOW())
      FROM process_preparation_inputs ppi
      JOIN process_preparations prep ON prep.id = ppi.preparation_id
      JOIN silos s ON s.id = ppi.source_silo_id
      JOIN inventories inv ON inv.material_id = ppi.material_id
      WHERE ppi.source_silo_id IS NOT NULL
        AND ppi.material_id IS NOT NULL
        AND COALESCE(prep.prepared_by, (SELECT id FROM users ORDER BY id LIMIT 1)) IS NOT NULL
      ON CONFLICT (process_preparation_input_id) WHERE process_preparation_input_id IS NOT NULL DO NOTHING;
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_inventory_movements_preparation_input;
      DROP INDEX IF EXISTS idx_inventory_movements_silo_date;
      ALTER TABLE inventory_movements
        DROP CONSTRAINT IF EXISTS inventory_movements_process_preparation_input_id_fkey,
        DROP CONSTRAINT IF EXISTS inventory_movements_process_preparation_id_fkey,
        DROP CONSTRAINT IF EXISTS inventory_movements_silo_id_fkey,
        DROP COLUMN IF EXISTS process_preparation_input_id,
        DROP COLUMN IF EXISTS process_preparation_id,
        DROP COLUMN IF EXISTS silo_id;
    `);
  },
};
