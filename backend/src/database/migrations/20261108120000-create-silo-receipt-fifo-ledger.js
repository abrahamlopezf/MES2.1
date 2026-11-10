'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        CREATE TABLE IF NOT EXISTS silo_receipt_lots (
          id BIGSERIAL PRIMARY KEY,
          silo_id INTEGER NOT NULL REFERENCES silos(id) ON UPDATE CASCADE ON DELETE RESTRICT,
          inventory_id INTEGER NULL REFERENCES inventories(id) ON UPDATE CASCADE ON DELETE SET NULL,
          material_id INTEGER NOT NULL REFERENCES materials(id) ON UPDATE CASCADE ON DELETE RESTRICT,
          supplier_id INTEGER NULL REFERENCES suppliers(id) ON UPDATE CASCADE ON DELETE SET NULL,
          source_inventory_movement_id INTEGER NULL UNIQUE REFERENCES inventory_movements(id) ON UPDATE CASCADE ON DELETE RESTRICT,
          source_audit_log_id BIGINT NULL REFERENCES audit_logs(id) ON UPDATE CASCADE ON DELETE SET NULL,
          source_reference VARCHAR(120) NULL,
          invoice_folio VARCHAR(120) NOT NULL,
          invoice_date DATE NOT NULL,
          received_at TIMESTAMPTZ NOT NULL,
          lot_kind VARCHAR(20) NOT NULL DEFAULT 'INVOICE',
          quantity_received_kg NUMERIC(14,3) NOT NULL,
          remaining_quantity_kg NUMERIC(14,3) NOT NULL,
          invoice_currency VARCHAR(3) NULL,
          invoice_unit_cost NUMERIC(14,6) NULL,
          unit_cost_mxn NUMERIC(14,6) NOT NULL DEFAULT 0,
          unit_cost_usd NUMERIC(14,6) NULL,
          exchange_rate_mxn_per_usd NUMERIC(14,8) NULL,
          exchange_rate_date DATE NULL,
          exchange_rate_source VARCHAR(80) NULL,
          notes TEXT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT silo_receipt_lots_quantity_positive CHECK (quantity_received_kg > 0),
          CONSTRAINT silo_receipt_lots_remaining_nonnegative CHECK (remaining_quantity_kg >= 0),
          CONSTRAINT silo_receipt_lots_remaining_not_over_received CHECK (remaining_quantity_kg <= quantity_received_kg)
        );

        ALTER TABLE process_preparation_inputs
          ADD COLUMN IF NOT EXISTS source_silo_receipt_lot_id BIGINT;
        ALTER TABLE inventory_movements
          ADD COLUMN IF NOT EXISTS source_silo_receipt_lot_id BIGINT;

        ALTER TABLE silos
          ALTER COLUMN current_stock_kg TYPE NUMERIC(14,3),
          ALTER COLUMN unit_cost TYPE NUMERIC(14,6);
        ALTER TABLE process_preparation_inputs
          ALTER COLUMN unit_cost_snapshot TYPE NUMERIC(14,6),
          ALTER COLUMN extended_cost_snapshot TYPE NUMERIC(16,6);
        ALTER TABLE inventory_movements
          ALTER COLUMN unit_cost TYPE NUMERIC(14,6),
          ALTER COLUMN total_cost TYPE NUMERIC(16,6);

        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'process_preparation_inputs_silo_receipt_lot_fkey') THEN
            ALTER TABLE process_preparation_inputs ADD CONSTRAINT process_preparation_inputs_silo_receipt_lot_fkey
              FOREIGN KEY (source_silo_receipt_lot_id) REFERENCES silo_receipt_lots(id) ON UPDATE CASCADE ON DELETE RESTRICT;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_movements_silo_receipt_lot_fkey') THEN
            ALTER TABLE inventory_movements ADD CONSTRAINT inventory_movements_silo_receipt_lot_fkey
              FOREIGN KEY (source_silo_receipt_lot_id) REFERENCES silo_receipt_lots(id) ON UPDATE CASCADE ON DELETE RESTRICT;
          END IF;
        END $$;

        CREATE INDEX IF NOT EXISTS idx_silo_receipt_lots_fifo
          ON silo_receipt_lots (silo_id, received_at, invoice_date, id)
          WHERE remaining_quantity_kg > 0;
        CREATE INDEX IF NOT EXISTS idx_silo_receipt_lots_invoice
          ON silo_receipt_lots (silo_id, invoice_date, invoice_folio);
        CREATE INDEX IF NOT EXISTS idx_process_preparation_inputs_silo_receipt_lot
          ON process_preparation_inputs (source_silo_receipt_lot_id)
          WHERE source_silo_receipt_lot_id IS NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_inventory_movements_silo_receipt_lot
          ON inventory_movements (source_silo_receipt_lot_id)
          WHERE source_silo_receipt_lot_id IS NOT NULL;

        -- Rebuild the historical receipt layers from warehouse SILO_ENTRY
        -- movements. Keep the exact material and MXN invoice cost on each layer.
        INSERT INTO silo_receipt_lots (
          silo_id, inventory_id, material_id, source_inventory_movement_id,
          source_audit_log_id, supplier_id, source_reference, invoice_folio, invoice_date,
          received_at, lot_kind, quantity_received_kg, remaining_quantity_kg,
          invoice_currency, invoice_unit_cost, unit_cost_mxn, unit_cost_usd,
          exchange_rate_mxn_per_usd, exchange_rate_date, exchange_rate_source,
          created_at, updated_at
        )
        SELECT
          movement.silo_id,
          movement.inventory_id,
          inventory.material_id,
          movement.id,
          movement.source_audit_log_id,
          CASE WHEN COALESCE(detail.entry->>'supplier_id', audit.metadata->>'supplier_id') ~ '^[0-9]+$'
            THEN COALESCE(detail.entry->>'supplier_id', audit.metadata->>'supplier_id')::integer ELSE NULL END,
          movement.source_reference,
          COALESCE(NULLIF(SPLIT_PART(movement.source_reference, '#', 1), ''), 'HISTORICO-S/R'),
          CASE WHEN COALESCE(detail.entry->>'invoice_date', audit.metadata->>'invoice_date') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
            THEN COALESCE(detail.entry->>'invoice_date', audit.metadata->>'invoice_date')::date ELSE movement.created_at::date END,
          movement.created_at,
          'INVOICE',
          movement.quantity_change,
          0,
          COALESCE(NULLIF(detail.entry->>'currency', ''), NULLIF(audit.metadata->>'invoice_currency', ''), 'MXN'),
          CASE WHEN COALESCE(detail.entry->>'invoice_unit_cost', audit.metadata->>'invoice_unit_cost') ~ '^[0-9]+(\\.[0-9]+)?$'
            THEN COALESCE(detail.entry->>'invoice_unit_cost', audit.metadata->>'invoice_unit_cost')::numeric ELSE movement.unit_cost END,
          COALESCE(movement.unit_cost, 0),
          CASE WHEN COALESCE(detail.entry->>'invoice_unit_cost_usd', audit.metadata->>'invoice_unit_cost_usd') ~ '^[0-9]+(\\.[0-9]+)?$'
            THEN COALESCE(detail.entry->>'invoice_unit_cost_usd', audit.metadata->>'invoice_unit_cost_usd')::numeric ELSE NULL END,
          CASE WHEN COALESCE(detail.entry->>'exchange_rate_mxn_per_usd', audit.metadata->>'exchange_rate_mxn_per_usd') ~ '^[0-9]+(\\.[0-9]+)?$'
            THEN COALESCE(detail.entry->>'exchange_rate_mxn_per_usd', audit.metadata->>'exchange_rate_mxn_per_usd')::numeric ELSE NULL END,
          CASE WHEN COALESCE(detail.entry->>'exchange_rate_date', audit.metadata->>'exchange_rate_date') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
            THEN COALESCE(detail.entry->>'exchange_rate_date', audit.metadata->>'exchange_rate_date')::date ELSE NULL END,
          COALESCE(detail.entry->>'exchange_rate_source', audit.metadata->>'exchange_rate_source'),
          movement.created_at,
          movement.created_at
        FROM inventory_movements movement
        JOIN inventories inventory ON inventory.id = movement.inventory_id
        LEFT JOIN audit_logs audit ON audit.id = movement.source_audit_log_id
        LEFT JOIN LATERAL (
          SELECT entry.value AS entry
          FROM jsonb_array_elements(CASE WHEN jsonb_typeof(audit.metadata->'entries') = 'array'
            THEN audit.metadata->'entries' ELSE '[]'::jsonb END)
            WITH ORDINALITY AS entry(value, ordinality)
          WHERE movement.source_reference = CONCAT(
            LEFT(COALESCE(NULLIF(entry.value->>'folio', ''), 'S-R'), 105), '#', entry.ordinality
          )
          LIMIT 1
        ) detail ON TRUE
        WHERE movement.type = 'SILO_ENTRY'
          AND movement.silo_id IS NOT NULL
          AND movement.quantity_change > 0
          AND NOT EXISTS (
            SELECT 1 FROM silo_receipt_lots existing
            WHERE existing.source_inventory_movement_id = movement.id
          );

        UPDATE inventory_movements movement
        SET source_silo_receipt_lot_id = lot.id
        FROM silo_receipt_lots lot
        WHERE lot.source_inventory_movement_id = movement.id
          AND movement.source_silo_receipt_lot_id IS NULL;

        -- Existing stock may predate invoice-level movement history. Replay
        -- known deductions FIFO, then create a clearly marked opening layer for
        -- the untracked initial balance. If old movement totals do not reconcile,
        -- preserve current silo stock in a reconciliation layer at its existing
        -- weighted-average cost instead of inventing a remaining invoice.
        WITH receipt_totals AS (
          SELECT silo_id, SUM(quantity_received_kg) AS received_kg
          FROM silo_receipt_lots WHERE lot_kind = 'INVOICE' GROUP BY silo_id
        ), consumption_totals AS (
          SELECT silo_id, SUM(ABS(quantity_change)) AS consumed_kg
          FROM inventory_movements
          WHERE silo_id IS NOT NULL AND quantity_change < 0 AND type = 'CONSUMPTION'
          GROUP BY silo_id
        ), state AS (
          SELECT s.id AS silo_id, s.current_stock_kg::numeric AS current_kg,
            COALESCE(r.received_kg, 0)::numeric AS received_kg,
            COALESCE(c.consumed_kg, 0)::numeric AS consumed_kg,
            (s.current_stock_kg::numeric - COALESCE(r.received_kg, 0)::numeric
              + COALESCE(c.consumed_kg, 0)::numeric) AS opening_kg
          FROM silos s
          LEFT JOIN receipt_totals r ON r.silo_id = s.id
          LEFT JOIN consumption_totals c ON c.silo_id = s.id
          WHERE s.current_stock_kg > 0
        ), identified_material AS (
          SELECT state.*,
            COALESCE(s.material_id,
              (SELECT lot.material_id FROM silo_receipt_lots lot
                WHERE lot.silo_id = state.silo_id AND lot.lot_kind = 'INVOICE'
                ORDER BY lot.received_at, lot.id LIMIT 1),
              (SELECT mt.material_id FROM material_tags mt
                JOIN materials material ON material.id = mt.material_id AND material.is_active = TRUE
                WHERE mt.tag_id = s.material_tag_id ORDER BY mt.material_id LIMIT 1)
            ) AS material_id,
            COALESCE(NULLIF(s.unit_cost, 0),
              (SELECT lot.unit_cost_mxn FROM silo_receipt_lots lot
                WHERE lot.silo_id = state.silo_id AND lot.lot_kind = 'INVOICE'
                ORDER BY lot.received_at, lot.id LIMIT 1), 0)::numeric AS opening_unit_cost
          FROM state JOIN silos s ON s.id = state.silo_id
        ), historical_consumption AS (
          SELECT i.silo_id,
            CASE WHEN i.opening_kg >= 0 THEN GREATEST(0, COALESCE(i.consumed_kg, 0) - i.opening_kg)
              ELSE COALESCE(i.consumed_kg, 0) - i.opening_kg END AS consumed_to_apply
          FROM identified_material i
        ), receipt_order AS (
          SELECT lot.id, lot.silo_id, lot.quantity_received_kg,
            SUM(lot.quantity_received_kg) OVER (
              PARTITION BY lot.silo_id ORDER BY lot.received_at, lot.invoice_date, lot.id
              ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
            ) AS prior_received_kg
          FROM silo_receipt_lots lot
          WHERE lot.lot_kind = 'INVOICE'
        )
        UPDATE silo_receipt_lots lot
        SET remaining_quantity_kg = CASE
          WHEN identified.opening_kg < 0 THEN 0
          ELSE GREATEST(0, lot.quantity_received_kg - GREATEST(0,
            history.consumed_to_apply - COALESCE(receipt_order.prior_received_kg, 0)
          ))
        END
        FROM identified_material identified
        JOIN historical_consumption history ON history.silo_id = identified.silo_id
        , receipt_order
        WHERE receipt_order.id = lot.id
          AND lot.silo_id = identified.silo_id;

        WITH receipt_totals AS (
          SELECT silo_id, SUM(quantity_received_kg) AS received_kg
          FROM silo_receipt_lots WHERE lot_kind = 'INVOICE' GROUP BY silo_id
        ), consumption_totals AS (
          SELECT silo_id, SUM(ABS(quantity_change)) AS consumed_kg
          FROM inventory_movements
          WHERE silo_id IS NOT NULL AND quantity_change < 0 AND type = 'CONSUMPTION'
          GROUP BY silo_id
        ), layers AS (
          SELECT s.id AS silo_id, s.current_stock_kg::numeric AS current_kg,
            COALESCE(r.received_kg, 0)::numeric AS received_kg,
            COALESCE(c.consumed_kg, 0)::numeric AS consumed_kg,
            (s.current_stock_kg::numeric - COALESCE(r.received_kg, 0)::numeric
              + COALESCE(c.consumed_kg, 0)::numeric) AS opening_kg,
            COALESCE(s.material_id,
              (SELECT lot.material_id FROM silo_receipt_lots lot
                WHERE lot.silo_id = s.id AND lot.lot_kind = 'INVOICE'
                ORDER BY lot.received_at, lot.id LIMIT 1),
              (SELECT mt.material_id FROM material_tags mt
                JOIN materials material ON material.id = mt.material_id AND material.is_active = TRUE
                WHERE mt.tag_id = s.material_tag_id ORDER BY mt.material_id LIMIT 1)
            ) AS material_id,
            COALESCE(NULLIF(s.unit_cost, 0),
              (SELECT lot.unit_cost_mxn FROM silo_receipt_lots lot
                WHERE lot.silo_id = s.id AND lot.lot_kind = 'INVOICE'
                ORDER BY lot.received_at, lot.id LIMIT 1), 0)::numeric AS opening_unit_cost,
            COALESCE((SELECT MIN(lot.received_at) FROM silo_receipt_lots lot
                WHERE lot.silo_id = s.id AND lot.lot_kind = 'INVOICE'), TIMESTAMPTZ '1900-01-01') - INTERVAL '1 second' AS opening_received_at
          FROM silos s
          LEFT JOIN receipt_totals r ON r.silo_id = s.id
          LEFT JOIN consumption_totals c ON c.silo_id = s.id
          WHERE s.current_stock_kg > 0
        )
        INSERT INTO silo_receipt_lots (
          silo_id, inventory_id, material_id, invoice_folio, invoice_date,
          received_at, lot_kind, quantity_received_kg, remaining_quantity_kg,
          invoice_currency, unit_cost_mxn, notes, created_at, updated_at
        )
        SELECT silo_id, NULL, material_id,
          CASE WHEN opening_kg >= 0 THEN CONCAT('SALDO-APERTURA-', silo_id)
            ELSE CONCAT('SALDO-RECONCILIADO-', silo_id) END,
          DATE '1900-01-01', opening_received_at,
          CASE WHEN opening_kg >= 0 THEN 'OPENING_BALANCE' ELSE 'RECONCILIATION' END,
          CASE WHEN opening_kg >= 0 THEN opening_kg ELSE current_kg END,
          CASE WHEN opening_kg >= 0 THEN GREATEST(0, opening_kg - consumed_kg) ELSE current_kg END,
          'MXN', opening_unit_cost,
          CASE WHEN opening_kg >= 0
            THEN 'Capa de saldo anterior a la bitácora FIFO; costo promedio heredado del silo.'
            ELSE 'Capa de conciliación: los movimientos históricos no explicaban el stock actual; se conserva el saldo y costo promedio sin atribuirlo a una factura.' END,
          NOW(), NOW()
        FROM layers
        WHERE material_id IS NOT NULL
          AND (opening_kg > 0 OR opening_kg < 0);

        -- Never allow operational stock to remain outside the FIFO ledger.
        DO $$ BEGIN
          IF EXISTS (
            SELECT 1
            FROM silos s
            LEFT JOIN (
              SELECT silo_id, SUM(remaining_quantity_kg) AS fifo_kg
              FROM silo_receipt_lots
              GROUP BY silo_id
            ) lots ON lots.silo_id = s.id
            WHERE s.current_stock_kg > 0
              AND ABS(s.current_stock_kg::numeric - COALESCE(lots.fifo_kg, 0)) > 0.001
          ) THEN
            RAISE EXCEPTION 'Silo FIFO migration did not reconcile with current stock; inspect silo_receipt_lots before retrying.';
          END IF;
        END $$;

        -- Database-level invariant: every committed silo stock change must
        -- have a matching committed change to its invoice/opening layers.
        CREATE OR REPLACE FUNCTION assert_silo_fifo_balance(p_silo_id integer)
        RETURNS void LANGUAGE plpgsql AS $$
        DECLARE
          silo_stock numeric;
          fifo_stock numeric;
        BEGIN
          SELECT current_stock_kg::numeric INTO silo_stock FROM silos WHERE id = p_silo_id;
          IF NOT FOUND THEN RETURN; END IF;
          SELECT COALESCE(SUM(remaining_quantity_kg), 0)::numeric INTO fifo_stock
            FROM silo_receipt_lots WHERE silo_id = p_silo_id;
          IF ABS(silo_stock - fifo_stock) > 0.001 THEN
            RAISE EXCEPTION 'Silo %: stock operativo (%) no concilia con capas FIFO (%).', p_silo_id, silo_stock, fifo_stock
              USING ERRCODE = '23514';
          END IF;
        END;
        $$;

        CREATE OR REPLACE FUNCTION enforce_silo_fifo_balance_trigger()
        RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
          IF TG_TABLE_NAME = 'silos' THEN
            PERFORM assert_silo_fifo_balance(COALESCE(NEW.id, OLD.id));
          ELSE
            IF TG_OP = 'UPDATE' AND OLD.silo_id IS DISTINCT FROM NEW.silo_id THEN
              PERFORM assert_silo_fifo_balance(OLD.silo_id);
              PERFORM assert_silo_fifo_balance(NEW.silo_id);
            ELSE
              PERFORM assert_silo_fifo_balance(COALESCE(NEW.silo_id, OLD.silo_id));
            END IF;
          END IF;
          RETURN NULL;
        END;
        $$;

        DROP TRIGGER IF EXISTS silos_fifo_balance_guard ON silos;
        CREATE CONSTRAINT TRIGGER silos_fifo_balance_guard
          AFTER INSERT OR UPDATE ON silos
          DEFERRABLE INITIALLY DEFERRED
          FOR EACH ROW EXECUTE FUNCTION enforce_silo_fifo_balance_trigger();

        DROP TRIGGER IF EXISTS silo_receipt_lots_fifo_balance_guard ON silo_receipt_lots;
        CREATE CONSTRAINT TRIGGER silo_receipt_lots_fifo_balance_guard
          AFTER INSERT OR UPDATE OR DELETE ON silo_receipt_lots
          DEFERRABLE INITIALLY DEFERRED
          FOR EACH ROW EXECUTE FUNCTION enforce_silo_fifo_balance_trigger();
      `, { transaction });
    });
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        DROP TRIGGER IF EXISTS silo_receipt_lots_fifo_balance_guard ON silo_receipt_lots;
        DROP TRIGGER IF EXISTS silos_fifo_balance_guard ON silos;
        DROP FUNCTION IF EXISTS enforce_silo_fifo_balance_trigger();
        DROP FUNCTION IF EXISTS assert_silo_fifo_balance(integer);
        ALTER TABLE inventory_movements
          DROP CONSTRAINT IF EXISTS inventory_movements_silo_receipt_lot_fkey,
          DROP COLUMN IF EXISTS source_silo_receipt_lot_id;
        ALTER TABLE process_preparation_inputs
          DROP CONSTRAINT IF EXISTS process_preparation_inputs_silo_receipt_lot_fkey,
          DROP COLUMN IF EXISTS source_silo_receipt_lot_id;
        DROP INDEX IF EXISTS idx_inventory_movements_silo_receipt_lot;
        DROP INDEX IF EXISTS idx_process_preparation_inputs_silo_receipt_lot;
        DROP INDEX IF EXISTS idx_silo_receipt_lots_invoice;
        DROP INDEX IF EXISTS idx_silo_receipt_lots_fifo;
        DROP TABLE IF EXISTS silo_receipt_lots;
      `, { transaction });
    });
  },
};
