'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        ALTER TABLE process_preparations
          ADD COLUMN IF NOT EXISTS cost_index_snapshot DECIMAL(8,4),
          ADD COLUMN IF NOT EXISTS material_cost_snapshot DECIMAL(14,4),
          ADD COLUMN IF NOT EXISTS transformed_value_snapshot DECIMAL(14,4),
          ADD COLUMN IF NOT EXISTS transformed_cost_per_kg DECIMAL(14,6),
          ADD COLUMN IF NOT EXISTS cost_valuation_status VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
          ADD COLUMN IF NOT EXISTS formula_snapshot JSONB,
          ADD COLUMN IF NOT EXISTS remaining_quantity_kg DECIMAL(14,3);

        ALTER TABLE process_preparation_inputs
          ALTER COLUMN source_traceable_item_id DROP NOT NULL,
          ALTER COLUMN source_qr_code_id DROP NOT NULL,
          ADD COLUMN IF NOT EXISTS source_lote_id INTEGER REFERENCES lotes(id) ON UPDATE CASCADE ON DELETE SET NULL,
          ADD COLUMN IF NOT EXISTS source_silo_id INTEGER REFERENCES silos(id) ON UPDATE CASCADE ON DELETE SET NULL,
          ADD COLUMN IF NOT EXISTS source_lot_number VARCHAR(120),
          ADD COLUMN IF NOT EXISTS unit_cost_snapshot DECIMAL(12,4),
          ADD COLUMN IF NOT EXISTS extended_cost_snapshot DECIMAL(14,4);

        ALTER TABLE extruder_queues
          ADD COLUMN IF NOT EXISTS process_preparation_id INTEGER REFERENCES process_preparations(id) ON UPDATE CASCADE ON DELETE SET NULL;

        ALTER TABLE extrusion_scrap_logs
          ALTER COLUMN to_mixture_qr_id DROP NOT NULL,
          ALTER COLUMN scrap_weight_kg TYPE DECIMAL(12,3),
          ADD COLUMN IF NOT EXISTS transition_id INTEGER,
          ADD COLUMN IF NOT EXISTS category VARCHAR(40) NOT NULL DEFAULT 'OPERATIVA',
          ADD COLUMN IF NOT EXISTS color VARCHAR(80),
          ADD COLUMN IF NOT EXISTS estimated_weight_kg DECIMAL(12,3),
          ADD COLUMN IF NOT EXISTS actual_weight_kg DECIMAL(12,3),
          ADD COLUMN IF NOT EXISTS valuation_unit_cost DECIMAL(14,6),
          ADD COLUMN IF NOT EXISTS valuation_total_cost DECIMAL(14,4),
          ADD COLUMN IF NOT EXISTS valuation_status VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',
          ADD COLUMN IF NOT EXISTS source_material_id INTEGER REFERENCES materials(id) ON UPDATE CASCADE ON DELETE SET NULL,
          ADD COLUMN IF NOT EXISTS source_lote_id INTEGER REFERENCES lotes(id) ON UPDATE CASCADE ON DELETE SET NULL,
          ADD COLUMN IF NOT EXISTS source_qr_code_id INTEGER REFERENCES qr_codes(id) ON UPDATE CASCADE ON DELETE SET NULL,
          ADD COLUMN IF NOT EXISTS from_mix_share DECIMAL(5,2),
          ADD COLUMN IF NOT EXISTS to_mix_share DECIMAL(5,2),
          ADD COLUMN IF NOT EXISTS shift_code VARCHAR(30),
          ADD COLUMN IF NOT EXISTS weighed_by INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
          ADD COLUMN IF NOT EXISTS weighed_at TIMESTAMPTZ;

        CREATE TABLE IF NOT EXISTS extrusion_transitions (
          id SERIAL PRIMARY KEY,
          extruder_id INTEGER NOT NULL REFERENCES extruders(id) ON UPDATE CASCADE ON DELETE RESTRICT,
          from_queue_id INTEGER REFERENCES extruder_queues(id) ON UPDATE CASCADE ON DELETE SET NULL,
          to_queue_id INTEGER NOT NULL REFERENCES extruder_queues(id) ON UPDATE CASCADE ON DELETE RESTRICT,
          from_mixture_qr VARCHAR(120) NOT NULL,
          to_mixture_qr VARCHAR(120) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'ABIERTA' CHECK (status IN ('ABIERTA', 'CERRADA')),
          shift_code VARCHAR(30),
          started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          closed_at TIMESTAMPTZ,
          started_by INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
          closed_by INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
          notes TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        DO $$ BEGIN
          ALTER TABLE extrusion_scrap_logs
            ADD CONSTRAINT extrusion_scrap_logs_transition_fk
            FOREIGN KEY (transition_id) REFERENCES extrusion_transitions(id)
            ON UPDATE CASCADE ON DELETE SET NULL;
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;

        CREATE TABLE IF NOT EXISTS extrusion_production_entries (
          id SERIAL PRIMARY KEY,
          process_preparation_id INTEGER REFERENCES process_preparations(id) ON UPDATE CASCADE ON DELETE SET NULL,
          queue_id INTEGER REFERENCES extruder_queues(id) ON UPDATE CASCADE ON DELETE SET NULL,
          extruder_id INTEGER NOT NULL REFERENCES extruders(id) ON UPDATE CASCADE ON DELETE RESTRICT,
          mixture_qr VARCHAR(120) NOT NULL,
          rack_id INTEGER NOT NULL REFERENCES pti_racks(id) ON UPDATE CASCADE ON DELETE RESTRICT,
          pti_product_id INTEGER NOT NULL REFERENCES pti_products(id) ON UPDATE CASCADE ON DELETE RESTRICT,
          pieces INTEGER NOT NULL CHECK (pieces > 0),
          net_weight_kg DECIMAL(12,3) NOT NULL CHECK (net_weight_kg > 0),
          weight_source VARCHAR(20) NOT NULL DEFAULT 'ESTIMADO' CHECK (weight_source IN ('BASCULA', 'ESTIMADO')),
          mixture_cost_per_kg DECIMAL(14,6),
          production_value DECIMAL(14,4),
          recorded_by INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
          recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          voided_at TIMESTAMPTZ,
          voided_by INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
          void_reason TEXT,
          notes TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS extrusion_scrap_adjustments (
          id SERIAL PRIMARY KEY,
          scrap_log_id INTEGER NOT NULL REFERENCES extrusion_scrap_logs(id) ON UPDATE CASCADE ON DELETE RESTRICT,
          previous_weight_kg DECIMAL(12,3) NOT NULL,
          corrected_weight_kg DECIMAL(12,3) NOT NULL,
          correction_reason TEXT NOT NULL,
          corrected_by INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS extrusion_production_adjustments (
          id SERIAL PRIMARY KEY,
          production_entry_id INTEGER NOT NULL REFERENCES extrusion_production_entries(id) ON UPDATE CASCADE ON DELETE RESTRICT,
          previous_pieces INTEGER NOT NULL,
          corrected_pieces INTEGER NOT NULL,
          previous_weight_kg DECIMAL(12,3) NOT NULL,
          corrected_weight_kg DECIMAL(12,3) NOT NULL,
          correction_reason TEXT NOT NULL,
          corrected_by INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS extrusion_shift_closures (
          id SERIAL PRIMARY KEY,
          extruder_id INTEGER NOT NULL REFERENCES extruders(id) ON UPDATE CASCADE ON DELETE RESTRICT,
          shift_date DATE NOT NULL,
          shift_code VARCHAR(30) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'CERRADO' CHECK (status IN ('CERRADO', 'REABIERTO')),
          estimated_scrap_kg DECIMAL(14,3) NOT NULL DEFAULT 0,
          actual_scrap_kg DECIMAL(14,3) NOT NULL DEFAULT 0,
          variance_kg DECIMAL(14,3) NOT NULL DEFAULT 0,
          closed_by INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
          closed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          notes TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (extruder_id, shift_date, shift_code)
        );

        CREATE INDEX IF NOT EXISTS idx_extrusion_scrap_transition ON extrusion_scrap_logs (transition_id);
        CREATE INDEX IF NOT EXISTS idx_extrusion_scrap_shift ON extrusion_scrap_logs (extruder_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_extrusion_production_prep ON extrusion_production_entries (process_preparation_id, recorded_at);
        CREATE INDEX IF NOT EXISTS idx_extrusion_production_queue ON extrusion_production_entries (queue_id);
        CREATE INDEX IF NOT EXISTS idx_extrusion_transition_machine_status ON extrusion_transitions (extruder_id, status);

        UPDATE extruder_queues q
        SET process_preparation_id = p.id
        FROM traceable_items ti
        JOIN qr_codes qr ON qr.id = ti.qr_code_id
        JOIN process_preparations p ON p.folio = ti.reference_folio
        WHERE q.process_preparation_id IS NULL
          AND q.consumption_order_qr_id = qr.qr_code;

        INSERT INTO subareas (area_id, name, nomenclature, is_active, created_at, updated_at)
        SELECT a.id, 'Telares Banda', 'TB', true, NOW(), NOW()
        FROM areas a
        WHERE a.code = 'TELARES'
          AND NOT EXISTS (
            SELECT 1 FROM subareas s
            WHERE s.area_id = a.id AND UPPER(s.nomenclature) = 'TB' AND s.deleted_at IS NULL
          );
      `, { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        DROP TABLE IF EXISTS extrusion_shift_closures;
        DROP TABLE IF EXISTS extrusion_production_adjustments;
        DROP TABLE IF EXISTS extrusion_scrap_adjustments;
        DROP TABLE IF EXISTS extrusion_production_entries;
        ALTER TABLE extrusion_scrap_logs DROP CONSTRAINT IF EXISTS extrusion_scrap_logs_transition_fk;
        DROP TABLE IF EXISTS extrusion_transitions;
        ALTER TABLE extrusion_scrap_logs
          DROP COLUMN IF EXISTS transition_id,
          DROP COLUMN IF EXISTS category,
          DROP COLUMN IF EXISTS color,
          DROP COLUMN IF EXISTS estimated_weight_kg,
          DROP COLUMN IF EXISTS actual_weight_kg,
          DROP COLUMN IF EXISTS valuation_unit_cost,
          DROP COLUMN IF EXISTS valuation_total_cost,
          DROP COLUMN IF EXISTS valuation_status,
          DROP COLUMN IF EXISTS source_material_id,
          DROP COLUMN IF EXISTS source_lote_id,
          DROP COLUMN IF EXISTS source_qr_code_id,
          DROP COLUMN IF EXISTS from_mix_share,
          DROP COLUMN IF EXISTS to_mix_share,
          DROP COLUMN IF EXISTS shift_code,
          DROP COLUMN IF EXISTS weighed_by,
          DROP COLUMN IF EXISTS weighed_at;
        ALTER TABLE extruder_queues DROP COLUMN IF EXISTS process_preparation_id;
        ALTER TABLE process_preparation_inputs
          DROP COLUMN IF EXISTS source_lote_id,
          DROP COLUMN IF EXISTS source_silo_id,
          DROP COLUMN IF EXISTS source_lot_number,
          DROP COLUMN IF EXISTS unit_cost_snapshot,
          DROP COLUMN IF EXISTS extended_cost_snapshot;
        ALTER TABLE process_preparations
          DROP COLUMN IF EXISTS cost_index_snapshot,
          DROP COLUMN IF EXISTS material_cost_snapshot,
          DROP COLUMN IF EXISTS transformed_value_snapshot,
          DROP COLUMN IF EXISTS transformed_cost_per_kg,
          DROP COLUMN IF EXISTS cost_valuation_status,
          DROP COLUMN IF EXISTS formula_snapshot,
          DROP COLUMN IF EXISTS remaining_quantity_kg;
      `, { transaction });
    });
  },
};
