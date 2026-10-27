'use strict';

/**
 * The 20260801211700 cleanup removed these tables, but the current extrusion,
 * mixing, and traceability flows still use them. Restore them before the
 * extrusion cost-ledger migration (20261024170000) alters them.
 *
 * CREATE IF NOT EXISTS preserves databases where the tables survived cleanup.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        CREATE TABLE IF NOT EXISTS process_formulas (
          id SERIAL PRIMARY KEY,
          code VARCHAR(80) NOT NULL UNIQUE,
          name VARCHAR(150) NOT NULL,
          description TEXT,
          target_area_id INTEGER NOT NULL REFERENCES areas(id) ON UPDATE CASCADE ON DELETE RESTRICT,
          target_intermediate_material_id INTEGER,
          version INTEGER NOT NULL DEFAULT 1,
          status VARCHAR(30) NOT NULL DEFAULT 'ACTIVA',
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_by INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
          updated_by INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS process_formula_items (
          id SERIAL PRIMARY KEY,
          formula_id INTEGER NOT NULL REFERENCES process_formulas(id) ON UPDATE CASCADE ON DELETE CASCADE,
          material_id INTEGER NOT NULL REFERENCES materials(id) ON UPDATE CASCADE ON DELETE RESTRICT,
          material_role VARCHAR(30) NOT NULL DEFAULT 'BASE',
          calculation_type VARCHAR(30) NOT NULL DEFAULT 'FIXED_QUANTITY',
          quantity DECIMAL(14,3),
          percentage DECIMAL(8,4),
          unit VARCHAR(20) NOT NULL,
          tolerance_min DECIMAL(8,4),
          tolerance_max DECIMAL(8,4),
          sort_order INTEGER NOT NULL DEFAULT 1,
          is_required BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        -- formula_id intentionally has no FK: a preparation may refer to the
        -- legacy process_formulas catalog or the active extrusion formulas catalog.
        CREATE TABLE IF NOT EXISTS process_preparations (
          id SERIAL PRIMARY KEY,
          folio VARCHAR(80) NOT NULL UNIQUE,
          formula_id INTEGER NOT NULL,
          from_area_id INTEGER NOT NULL REFERENCES areas(id) ON UPDATE CASCADE ON DELETE RESTRICT,
          to_area_id INTEGER NOT NULL REFERENCES areas(id) ON UPDATE CASCADE ON DELETE RESTRICT,
          destination_qr_code_id INTEGER REFERENCES qr_codes(id) ON UPDATE CASCADE ON DELETE RESTRICT,
          destination_traceable_item_id INTEGER REFERENCES traceable_items(id) ON UPDATE CASCADE ON DELETE SET NULL,
          target_intermediate_material_id INTEGER,
          total_quantity DECIMAL(14,3) NOT NULL,
          unit VARCHAR(20) NOT NULL,
          status VARCHAR(30) NOT NULL DEFAULT 'TRANSFERIDA',
          is_silo_kit BOOLEAN NOT NULL DEFAULT false,
          cost_index_snapshot DECIMAL(8,4),
          material_cost_snapshot DECIMAL(14,4),
          transformed_value_snapshot DECIMAL(14,4),
          transformed_cost_per_kg DECIMAL(14,6),
          cost_valuation_status VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
          formula_snapshot JSONB,
          remaining_quantity_kg DECIMAL(14,3),
          notes TEXT,
          metadata JSONB,
          prepared_by INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
          prepared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          received_by INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
          received_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS process_preparation_inputs (
          id SERIAL PRIMARY KEY,
          preparation_id INTEGER NOT NULL REFERENCES process_preparations(id) ON UPDATE CASCADE ON DELETE CASCADE,
          formula_item_id INTEGER REFERENCES process_formula_items(id) ON UPDATE CASCADE ON DELETE SET NULL,
          source_traceable_item_id INTEGER REFERENCES traceable_items(id) ON UPDATE CASCADE ON DELETE RESTRICT,
          source_qr_code_id INTEGER REFERENCES qr_codes(id) ON UPDATE CASCADE ON DELETE RESTRICT,
          material_id INTEGER NOT NULL REFERENCES materials(id) ON UPDATE CASCADE ON DELETE RESTRICT,
          quantity DECIMAL(14,3) NOT NULL,
          unit VARCHAR(20) NOT NULL,
          balance_before DECIMAL(14,3) NOT NULL,
          balance_after DECIMAL(14,3) NOT NULL,
          source_lote_id INTEGER REFERENCES lotes(id) ON UPDATE CASCADE ON DELETE SET NULL,
          source_silo_id INTEGER REFERENCES silos(id) ON UPDATE CASCADE ON DELETE SET NULL,
          source_lot_number VARCHAR(120),
          unit_cost_snapshot DECIMAL(12,4),
          extended_cost_snapshot DECIMAL(14,4),
          notes TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_process_formulas_target_area ON process_formulas(target_area_id);
        CREATE INDEX IF NOT EXISTS idx_process_formula_items_formula ON process_formula_items(formula_id);
        CREATE INDEX IF NOT EXISTS idx_process_formula_items_material ON process_formula_items(material_id);
        CREATE INDEX IF NOT EXISTS idx_process_preparations_formula ON process_preparations(formula_id);
        CREATE INDEX IF NOT EXISTS idx_process_preparations_from_area ON process_preparations(from_area_id);
        CREATE INDEX IF NOT EXISTS idx_process_preparations_to_area ON process_preparations(to_area_id);
        CREATE INDEX IF NOT EXISTS idx_process_preparations_destination_qr ON process_preparations(destination_qr_code_id);
        CREATE INDEX IF NOT EXISTS idx_process_preparations_status ON process_preparations(status);
        CREATE INDEX IF NOT EXISTS idx_process_preparation_inputs_preparation ON process_preparation_inputs(preparation_id);
        CREATE INDEX IF NOT EXISTS idx_process_preparation_inputs_source_item ON process_preparation_inputs(source_traceable_item_id);
        CREATE INDEX IF NOT EXISTS idx_process_preparation_inputs_source_qr ON process_preparation_inputs(source_qr_code_id);
        CREATE INDEX IF NOT EXISTS idx_process_preparation_inputs_material ON process_preparation_inputs(material_id);
      `, { transaction });
    });
  },

  // A repair migration must not drop these tables on rollback; some installations
  // may have retained them and CREATE IF NOT EXISTS does not track ownership.
  async down() {},
};
