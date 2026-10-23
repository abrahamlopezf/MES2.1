'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Catálogo de Telares (Máquinas circulares / planas)
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS looms (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        model VARCHAR(100) DEFAULT 'LOHIA LSL-6',
        type VARCHAR(50) NOT NULL DEFAULT 'CIRCULAR',
        rpm INTEGER NOT NULL DEFAULT 120,
        status VARCHAR(50) NOT NULL DEFAULT 'DISPONIBLE',
        current_bom_id INTEGER,
        active_warp_rack_id INTEGER REFERENCES pti_racks(id) ON UPDATE CASCADE ON DELETE SET NULL,
        active_weft_rack_id INTEGER REFERENCES pti_racks(id) ON UPDATE CASCADE ON DELETE SET NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Catálogo de Recetas / BOMs de Producción (boms_produccion)
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS production_boms (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(150) NOT NULL,
        description TEXT,
        target_width_cm DECIMAL(10,2) NOT NULL DEFAULT 50.00,
        target_weight_g_per_m DECIMAL(10,2) NOT NULL DEFAULT 65.00,
        warp_density DECIMAL(10,2) DEFAULT 10.00,
        weft_density DECIMAL(10,2) DEFAULT 10.00,
        output_product_name VARCHAR(150) NOT NULL DEFAULT 'Rollo de Tela Tubular',
        default_route JSON NOT NULL DEFAULT '["TELARES", "LAMINADO", "CORTE"]'::json,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 3. Componentes N a N del BOM (production_bom_items)
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS production_bom_items (
        id SERIAL PRIMARY KEY,
        bom_id INTEGER NOT NULL REFERENCES production_boms(id) ON UPDATE CASCADE ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL DEFAULT 'URDIMBRE',
        pti_product_id INTEGER REFERENCES pti_products(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        material_id INTEGER REFERENCES materials(id) ON UPDATE CASCADE ON DELETE SET NULL,
        ratio_percentage DECIMAL(5,2) NOT NULL DEFAULT 50.00,
        consumption_g_per_m DECIMAL(10,2) NOT NULL DEFAULT 32.50,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 4. Corridas / Órdenes activas en Telares (loom_runs)
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS loom_runs (
        id SERIAL PRIMARY KEY,
        folio VARCHAR(100) NOT NULL UNIQUE,
        loom_id INTEGER NOT NULL REFERENCES looms(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        bom_id INTEGER NOT NULL REFERENCES production_boms(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        operator_id INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
        shift VARCHAR(20) NOT NULL DEFAULT 'TURNO_1',
        status VARCHAR(50) NOT NULL DEFAULT 'EN_PROCESO',
        warp_rack_id INTEGER REFERENCES pti_racks(id) ON UPDATE CASCADE ON DELETE SET NULL,
        weft_rack_id INTEGER REFERENCES pti_racks(id) ON UPDATE CASCADE ON DELETE SET NULL,
        meters_planned DECIMAL(10,2) NOT NULL DEFAULT 1500.00,
        meters_produced DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        total_weight_produced_kg DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        total_pti_consumed_kg DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        rolls_produced_count INTEGER NOT NULL DEFAULT 0,
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        finished_at TIMESTAMPTZ,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 5. Rollos de Tela con QR Viajero (viajero_rolls)
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS viajero_rolls (
        id SERIAL PRIMARY KEY,
        qr_code VARCHAR(100) NOT NULL UNIQUE,
        roll_code VARCHAR(100) NOT NULL UNIQUE,
        run_id INTEGER REFERENCES loom_runs(id) ON UPDATE CASCADE ON DELETE SET NULL,
        loom_id INTEGER REFERENCES looms(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        bom_id INTEGER REFERENCES production_boms(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        operator_id INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
        meters DECIMAL(10,2) NOT NULL,
        weight_kg DECIMAL(10,2) NOT NULL,
        width_cm DECIMAL(10,2) NOT NULL,
        grammage_g_per_m DECIMAL(10,2) NOT NULL,
        route JSON NOT NULL,
        current_stage VARCHAR(50) NOT NULL DEFAULT 'TELARES',
        next_allowed_stage VARCHAR(50) NOT NULL,
        stages_history JSON NOT NULL DEFAULT '[]'::json,
        status VARCHAR(50) NOT NULL DEFAULT 'DISPONIBLE',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 6. Registro de Trazabilidad y Enrutamiento del QR Viajero (viajero_routing_logs)
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS viajero_routing_logs (
        id SERIAL PRIMARY KEY,
        viajero_roll_id INTEGER NOT NULL REFERENCES viajero_rolls(id) ON UPDATE CASCADE ON DELETE CASCADE,
        from_stage VARCHAR(50) NOT NULL,
        to_stage VARCHAR(50) NOT NULL,
        area_id INTEGER REFERENCES areas(id) ON UPDATE CASCADE ON DELETE SET NULL,
        operator_id INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
        action VARCHAR(50) NOT NULL,
        meters_in DECIMAL(10,2),
        meters_out DECIMAL(10,2),
        weight_in_kg DECIMAL(10,2),
        weight_out_kg DECIMAL(10,2),
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 7. Consumos Backflushing por Rollo (loom_backflush_consumptions)
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS loom_backflush_consumptions (
        id SERIAL PRIMARY KEY,
        viajero_roll_id INTEGER NOT NULL REFERENCES viajero_rolls(id) ON UPDATE CASCADE ON DELETE CASCADE,
        loom_run_id INTEGER REFERENCES loom_runs(id) ON UPDATE CASCADE ON DELETE SET NULL,
        rack_id INTEGER REFERENCES pti_racks(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        pti_product_id INTEGER REFERENCES pti_products(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        role VARCHAR(50) NOT NULL,
        theoretical_kg DECIMAL(10,2) NOT NULL,
        spools_consumed DECIMAL(10,2) NOT NULL,
        rack_balance_spools_before DECIMAL(10,2) NOT NULL,
        rack_balance_spools_after DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 8. Poblar Telares Iniciales (1 al 6)
    await queryInterface.sequelize.query(`
      INSERT INTO looms (id, code, name, model, type, rpm, status, is_active, created_at, updated_at)
      VALUES
        (1, 'TEL-01', 'Telar Circular 01', 'LOHIA LSL-6', 'CIRCULAR', 120, 'DISPONIBLE', true, NOW(), NOW()),
        (2, 'TEL-02', 'Telar Circular 02', 'LOHIA LSL-6', 'CIRCULAR', 120, 'DISPONIBLE', true, NOW(), NOW()),
        (3, 'TEL-03', 'Telar Circular 03', 'LOHIA LSL-6', 'CIRCULAR', 120, 'DISPONIBLE', true, NOW(), NOW()),
        (4, 'TEL-04', 'Telar Circular 04', 'STARLINGER FX 6.0', 'CIRCULAR', 130, 'DISPONIBLE', true, NOW(), NOW()),
        (5, 'TEL-05', 'Telar Circular 05', 'STARLINGER FX 6.0', 'CIRCULAR', 130, 'DISPONIBLE', true, NOW(), NOW()),
        (6, 'TEL-06', 'Telar Plano 06', 'SULZER TEXTIL', 'PLANO', 100, 'DISPONIBLE', true, NOW(), NOW())
      ON CONFLICT (code) DO NOTHING;

      SELECT setval('looms_id_seq', (SELECT COALESCE(MAX(id), 1) FROM looms));
    `);

    // 9. Poblar BOMs de Producción Iniciales
    await queryInterface.sequelize.query(`
      INSERT INTO production_boms (id, code, name, description, target_width_cm, target_weight_g_per_m, warp_density, weft_density, output_product_name, default_route, is_active, created_at, updated_at)
      VALUES
        (
          1,
          'BOM-TEL-50-BLANCA',
          'Tela Tubular 50cm Blanca 65g/m (Ruta: Laminado -> Corte)',
          'Receta estándar para costal harinero con proceso de laminado y corte',
          50.00,
          65.00,
          10.00,
          10.00,
          'Rollo Tela Tubular 50cm Blanca',
          '["TELARES", "LAMINADO", "CORTE"]'::json,
          true,
          NOW(),
          NOW()
        ),
        (
          2,
          'BOM-TEL-60-GLOBO',
          'Tela Tubular 60cm Natural (Ruta: Globo -> Laminado -> Corte)',
          'Receta con expansión de globo y laminado para empaque de azúcar',
          60.00,
          75.00,
          11.00,
          11.00,
          'Rollo Tela Tubular 60cm Globo',
          '["TELARES", "GLOBO", "LAMINADO", "CORTE"]'::json,
          true,
          NOW(),
          NOW()
        ),
        (
          3,
          'BOM-TEL-45-DIRECTO',
          'Tela Tubular 45cm Color (Ruta: Corte Directo)',
          'Tela cruda sin laminado para sacos rústicos o forrajeros',
          45.00,
          58.00,
          9.50,
          9.50,
          'Rollo Tela Tubular 45cm Cruda',
          '["TELARES", "CORTE"]'::json,
          true,
          NOW(),
          NOW()
        )
      ON CONFLICT (code) DO NOTHING;

      SELECT setval('production_boms_id_seq', (SELECT COALESCE(MAX(id), 1) FROM production_boms));
    `);

    // 10. Vincular ingredientes N a N de BOMs con los primeros PTI Products disponibles
    await queryInterface.sequelize.query(`
      DO $$
      DECLARE
        first_pti_id INTEGER;
        second_pti_id INTEGER;
      BEGIN
        SELECT id INTO first_pti_id FROM pti_products WHERE is_active = true ORDER BY id ASC LIMIT 1;
        SELECT id INTO second_pti_id FROM pti_products WHERE is_active = true ORDER BY id DESC LIMIT 1;
        
        IF first_pti_id IS NOT NULL THEN
          -- BOM 1: Urdimbre (50%) + Trama (50%)
          INSERT INTO production_bom_items (bom_id, role, pti_product_id, ratio_percentage, consumption_g_per_m, notes, created_at, updated_at)
          VALUES 
            (1, 'URDIMBRE', first_pti_id, 50.00, 32.50, 'Cintas de urdimbre en telar', NOW(), NOW()),
            (1, 'TRAMA', COALESCE(second_pti_id, first_pti_id), 50.00, 32.50, 'Cintas de pasada / trama en telar', NOW(), NOW())
          ON CONFLICT DO NOTHING;

          -- BOM 2: Urdimbre + Trama Globo
          INSERT INTO production_bom_items (bom_id, role, pti_product_id, ratio_percentage, consumption_g_per_m, notes, created_at, updated_at)
          VALUES 
            (2, 'URDIMBRE', first_pti_id, 50.00, 37.50, 'Urdimbre reforzada para globo', NOW(), NOW()),
            (2, 'TRAMA', COALESCE(second_pti_id, first_pti_id), 50.00, 37.50, 'Trama elástica para expansión', NOW(), NOW())
          ON CONFLICT DO NOTHING;

          -- BOM 3: Directo a corte
          INSERT INTO production_bom_items (bom_id, role, pti_product_id, ratio_percentage, consumption_g_per_m, notes, created_at, updated_at)
          VALUES 
            (3, 'URDIMBRE', first_pti_id, 50.00, 29.00, 'Urdimbre ligera', NOW(), NOW()),
            (3, 'TRAMA', COALESCE(second_pti_id, first_pti_id), 50.00, 29.00, 'Trama estándar', NOW(), NOW())
          ON CONFLICT DO NOTHING;
        END IF;
      END $$;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS loom_backflush_consumptions CASCADE;
      DROP TABLE IF EXISTS viajero_routing_logs CASCADE;
      DROP TABLE IF EXISTS viajero_rolls CASCADE;
      DROP TABLE IF EXISTS loom_runs CASCADE;
      DROP TABLE IF EXISTS production_bom_items CASCADE;
      DROP TABLE IF EXISTS production_boms CASCADE;
      DROP TABLE IF EXISTS looms CASCADE;
    `);
  }
};
