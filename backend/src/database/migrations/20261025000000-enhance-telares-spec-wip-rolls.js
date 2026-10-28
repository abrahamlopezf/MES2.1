'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Ampliar campos de production_boms (Ficha técnica de Tela / Banda según PDF)
    await queryInterface.sequelize.query(`
      ALTER TABLE production_boms
        ADD COLUMN IF NOT EXISTS ounces_yd2 DECIMAL(6,2),
        ADD COLUMN IF NOT EXISTS fabric_type VARCHAR(30) NOT NULL DEFAULT 'TUBULAR',
        ADD COLUMN IF NOT EXISTS tape_color VARCHAR(80) NOT NULL DEFAULT 'N/A',
        ADD COLUMN IF NOT EXISTS tape_denier INTEGER DEFAULT 2300,
        ADD COLUMN IF NOT EXISTS tape_width_mm DECIMAL(5,2) DEFAULT 3.00,
        ADD COLUMN IF NOT EXISTS weft_denier VARCHAR(50) DEFAULT '1800 - 2000',
        ADD COLUMN IF NOT EXISTS warp_denier VARCHAR(50) DEFAULT '1800 - 2000',
        ADD COLUMN IF NOT EXISTS cost_transformation_index DECIMAL(8,4) NOT NULL DEFAULT 1.0000,
        ADD COLUMN IF NOT EXISTS general_considerations TEXT;
    `);

    // 2. Ampliar campos de looms (Número de Telar, Capacidad Creel 1800 bobinas, WIP interno, total rollos)
    await queryInterface.sequelize.query(`
      ALTER TABLE looms
        ADD COLUMN IF NOT EXISTS loom_number INTEGER,
        ADD COLUMN IF NOT EXISTS creel_capacity_spools INTEGER NOT NULL DEFAULT 1800,
        ADD COLUMN IF NOT EXISTS current_spools_count DECIMAL(10,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS current_wip_kg DECIMAL(10,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS total_rolls_produced INTEGER NOT NULL DEFAULT 0;
    `);

    // 3. Ampliar campos de viajero_rolls (Codificación 10-3-24-1200 y trazabilidad de costo)
    await queryInterface.sequelize.query(`
      ALTER TABLE viajero_rolls
        ADD COLUMN IF NOT EXISTS loom_number INTEGER,
        ADD COLUMN IF NOT EXISTS shift_number INTEGER,
        ADD COLUMN IF NOT EXISTS roll_sequence INTEGER,
        ADD COLUMN IF NOT EXISTS operator_nomina VARCHAR(50),
        ADD COLUMN IF NOT EXISTS cost_transformation_index DECIMAL(8,4) DEFAULT 1.0000,
        ADD COLUMN IF NOT EXISTS calculated_roll_cost DECIMAL(14,4) DEFAULT 0.0000,
        ADD COLUMN IF NOT EXISTS ounces_yd2 DECIMAL(6,2),
        ADD COLUMN IF NOT EXISTS fabric_type VARCHAR(30),
        ADD COLUMN IF NOT EXISTS tape_color VARCHAR(80);
    `);

    // 4-7. Asegurar subárea Telares Banda, los 21 Telares, y los Roles/Operadores de Telares sin colisionar IDs ni índices parciales
    await queryInterface.sequelize.query(`
      DO $$
      DECLARE
        v_telares_area_id INTEGER;
        v_banda_subarea_id INTEGER;
        v_sup_role_id INTEGER;
        v_op_role_id INTEGER;
      BEGIN
        SELECT id INTO v_telares_area_id FROM areas WHERE code = 'TELARES' LIMIT 1;

        IF v_telares_area_id IS NOT NULL THEN
          SELECT id INTO v_banda_subarea_id
          FROM subareas
          WHERE area_id = v_telares_area_id AND UPPER(nomenclature) = 'TB' AND deleted_at IS NULL
          LIMIT 1;

          IF v_banda_subarea_id IS NULL THEN
            INSERT INTO subareas (area_id, name, nomenclature, is_active, created_at, updated_at)
            VALUES (v_telares_area_id, 'Telares Banda', 'TB', true, NOW(), NOW())
            RETURNING id INTO v_banda_subarea_id;
          ELSE
            UPDATE subareas
            SET name = 'Telares Banda', is_active = true, updated_at = NOW()
            WHERE id = v_banda_subarea_id;
          END IF;
        END IF;

        PERFORM setval('subareas_id_seq', (SELECT COALESCE(MAX(id), 1) FROM subareas));

        -- Actualizar los telares existentes (1 al 6)
        UPDATE looms SET loom_number = 1, creel_capacity_spools = 1800 WHERE id = 1 OR code = 'TEL-01';
        UPDATE looms SET loom_number = 2, creel_capacity_spools = 1800 WHERE id = 2 OR code = 'TEL-02';
        UPDATE looms SET loom_number = 3, creel_capacity_spools = 1800 WHERE id = 3 OR code = 'TEL-03';
        UPDATE looms SET loom_number = 4, creel_capacity_spools = 1800 WHERE id = 4 OR code = 'TEL-04';
        UPDATE looms SET loom_number = 5, creel_capacity_spools = 1800 WHERE id = 5 OR code = 'TEL-05';
        UPDATE looms SET loom_number = 6, creel_capacity_spools = 1800 WHERE id = 6 OR code = 'TEL-06';

        -- Insertar Telares 7 al 21 si no existen
        INSERT INTO looms (code, name, model, type, rpm, status, is_active, subarea_id, loom_number, creel_capacity_spools, current_spools_count, current_wip_kg, total_rolls_produced, created_at, updated_at)
        VALUES
          ('TEL-07', 'Telar Circular 07', 'LOHIA LSL-6', 'CIRCULAR', 120, 'DISPONIBLE', true, null, 7, 1800, 0, 0, 0, NOW(), NOW()),
          ('TEL-08', 'Telar Circular 08', 'LOHIA LSL-6', 'CIRCULAR', 120, 'DISPONIBLE', true, null, 8, 1800, 0, 0, 0, NOW(), NOW()),
          ('TEL-09', 'Telar Circular 09', 'LOHIA LSL-6', 'CIRCULAR', 120, 'DISPONIBLE', true, null, 9, 1800, 0, 0, 0, NOW(), NOW()),
          ('TEL-10', 'Telar Circular 10', 'STARLINGER FX 6.0', 'CIRCULAR', 130, 'DISPONIBLE', true, null, 10, 1800, 1200, 240, 23, NOW(), NOW()),
          ('TEL-11', 'Telar Circular 11', 'STARLINGER FX 6.0', 'CIRCULAR', 130, 'DISPONIBLE', true, null, 11, 1800, 0, 0, 0, NOW(), NOW()),
          ('TEL-12', 'Telar Circular 12', 'STARLINGER FX 6.0', 'CIRCULAR', 130, 'DISPONIBLE', true, null, 12, 1800, 0, 0, 0, NOW(), NOW()),
          ('TEL-13', 'Telar Circular 13', 'LOHIA NOVA 6', 'CIRCULAR', 125, 'DISPONIBLE', true, null, 13, 1800, 0, 0, 0, NOW(), NOW()),
          ('TEL-14', 'Telar Circular 14', 'LOHIA NOVA 6', 'CIRCULAR', 125, 'DISPONIBLE', true, null, 14, 1800, 0, 0, 0, NOW(), NOW()),
          ('TEL-15', 'Telar Circular 15', 'LOHIA NOVA 6', 'CIRCULAR', 125, 'DISPONIBLE', true, null, 15, 1800, 0, 0, 0, NOW(), NOW()),
          ('TEL-16', 'Telar Circular 16', 'LOHIA LSL-8', 'CIRCULAR', 110, 'DISPONIBLE', true, null, 16, 1800, 0, 0, 0, NOW(), NOW()),
          ('TEL-17', 'Telar Circular 17', 'LOHIA LSL-8', 'CIRCULAR', 110, 'DISPONIBLE', true, null, 17, 1800, 0, 0, 0, NOW(), NOW()),
          ('TEL-18', 'Telar Banda 18', 'MÜLLER TELARES BANDA', 'BANDA', 150, 'DISPONIBLE', true, v_banda_subarea_id, 18, 1800, 450, 90, 12, NOW(), NOW()),
          ('TEL-19', 'Telar Banda 19', 'MÜLLER TELARES BANDA', 'BANDA', 150, 'DISPONIBLE', true, v_banda_subarea_id, 19, 1800, 600, 120, 15, NOW(), NOW()),
          ('TEL-20', 'Telar Banda 20', 'MÜLLER TELARES BANDA', 'BANDA', 150, 'DISPONIBLE', true, v_banda_subarea_id, 20, 1800, 0, 0, 0, NOW(), NOW()),
          ('TEL-21', 'Telar Banda 21', 'MÜLLER TELARES BANDA', 'BANDA', 150, 'DISPONIBLE', true, v_banda_subarea_id, 21, 1800, 0, 0, 0, NOW(), NOW())
        ON CONFLICT (code) DO UPDATE SET
          loom_number = EXCLUDED.loom_number,
          creel_capacity_spools = EXCLUDED.creel_capacity_spools,
          subarea_id = EXCLUDED.subarea_id;

        PERFORM setval('looms_id_seq', (SELECT COALESCE(MAX(id), 1) FROM looms));

        -- Roles de Telares por code (respetando índice parcial deleted_at IS NULL)
        SELECT id INTO v_sup_role_id FROM roles WHERE code = 'SUPERVISOR_TELARES' AND deleted_at IS NULL LIMIT 1;
        IF v_sup_role_id IS NULL THEN
          INSERT INTO roles (name, code, description, is_system, is_active, area_id, created_at, updated_at)
          VALUES ('Supervisor de Telares', 'SUPERVISOR_TELARES', 'Supervisor operativo de Tejeduría y Telares Banda', false, true, v_telares_area_id, NOW(), NOW())
          RETURNING id INTO v_sup_role_id;
        ELSE
          UPDATE roles SET name = 'Supervisor de Telares', area_id = COALESCE(v_telares_area_id, area_id), is_active = true, updated_at = NOW()
          WHERE id = v_sup_role_id;
        END IF;

        SELECT id INTO v_op_role_id FROM roles WHERE code = 'OPERADOR_TELARES' AND deleted_at IS NULL LIMIT 1;
        IF v_op_role_id IS NULL THEN
          INSERT INTO roles (name, code, description, is_system, is_active, area_id, created_at, updated_at)
          VALUES ('Operador de Telares', 'OPERADOR_TELARES', 'Operador de tejeduría circular y telares banda', false, true, v_telares_area_id, NOW(), NOW())
          RETURNING id INTO v_op_role_id;
        ELSE
          UPDATE roles SET name = 'Operador de Telares', area_id = COALESCE(v_telares_area_id, area_id), is_active = true, updated_at = NOW()
          WHERE id = v_op_role_id;
        END IF;

        PERFORM setval('roles_id_seq', (SELECT COALESCE(MAX(id), 1) FROM roles));

        -- Poblar operadores de tejido con números de nómina sin colisionar email ni numero_nomina
        IF v_op_role_id IS NOT NULL THEN
          INSERT INTO users (first_name, last_name, email, username, numero_nomina, password_hash, role_id, is_active, must_change_password, created_at, updated_at)
          SELECT v.first_name, v.last_name, v.email, v.username, v.numero_nomina, v.password_hash, v_op_role_id, true, false, NOW(), NOW()
          FROM (VALUES
            ('Carlos', 'Morales', 'cmorales@empresa.com', 'op_tel_1200', '1200', '$2b$10$abcdefghijklmnopqrstuvwxyz123456'),
            ('Juan Pablo', 'Castillo', 'jcastillo@empresa.com', 'op_tel_1201', '1201', '$2b$10$abcdefghijklmnopqrstuvwxyz123456'),
            ('Miguel Ángel', 'Ruiz', 'mruiz@empresa.com', 'op_tel_1202', '1202', '$2b$10$abcdefghijklmnopqrstuvwxyz123456'),
            ('Roberto', 'Méndez', 'rmendez@empresa.com', 'op_tel_1203', '1203', '$2b$10$abcdefghijklmnopqrstuvwxyz123456')
          ) AS v(first_name, last_name, email, username, numero_nomina, password_hash)
          WHERE NOT EXISTS (
            SELECT 1 FROM users u
            WHERE u.username = v.username OR u.email = v.email OR u.numero_nomina = v.numero_nomina
          );
        END IF;

        IF v_sup_role_id IS NOT NULL THEN
          INSERT INTO users (first_name, last_name, email, username, numero_nomina, password_hash, role_id, is_active, must_change_password, created_at, updated_at)
          SELECT 'Eduardo', 'Vargas', 'evargas@empresa.com', 'sup_tel_1150', '1150', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', v_sup_role_id, true, false, NOW(), NOW()
          WHERE NOT EXISTS (
            SELECT 1 FROM users u
            WHERE u.username = 'sup_tel_1150' OR u.email = 'evargas@empresa.com' OR u.numero_nomina = '1150'
          );
        END IF;
      END $$;
    `);

    // 8. Poblar Catálogo de Telas y Bandas según Especificación del PDF (Página 1)
    await queryInterface.sequelize.query(`
      INSERT INTO production_boms (
        code, name, description, target_width_cm, target_weight_g_per_m, warp_density, weft_density,
        output_product_name, default_route, ounces_yd2, fabric_type, tape_color, tape_denier,
        tape_width_mm, weft_denier, warp_denier, cost_transformation_index, general_considerations,
        is_active, created_at, updated_at
      )
      VALUES
        (
          'BOM-TEL-3.0-TUB',
          'Tela Tubular 3.0 oz/yd² (1200D/1200D)',
          'Tela tubular ligera de 3.0 oz para costales rústicos. Cinta Denier 1200 (3mm)',
          50.00, 45.00, 10.00, 10.00,
          'Rollo Tela Tubular 3.0 oz',
          '["TELARES", "CORTE"]'::json,
          3.0, 'TUBULAR', 'N/A', 1200, 3.00, '1200', '1200', 1.0500,
          'CINTA DENIER 1200 (3mm)', true, NOW(), NOW()
        ),
        (
          'BOM-TEL-5.0-TUB',
          'Tela Tubular 5.0 oz/yd² Verde/Morado (1800-2000D)',
          'Tela tubular mediana de 5.0 oz con cinta de identificación Verde/Morado Denier 2300 (3mm)',
          55.00, 65.00, 10.50, 10.50,
          'Rollo Tela Tubular 5.0 oz Verde/Morado',
          '["TELARES", "LAMINADO", "CORTE"]'::json,
          5.0, 'TUBULAR', 'VERDE / MORADO', 2300, 3.00, '1800 - 2000', '1800 - 2000', 1.0800,
          'CINTA DE IDENTIFICACIÓN DENIER 2300 (3mm)', true, NOW(), NOW()
        ),
        (
          'BOM-TEL-5.0-PLA',
          'Tela Plana 5.0 oz/yd² (1800-2000D)',
          'Tela plana de 5.0 oz para sacos especializados. No lleva cinta de identificación',
          110.00, 65.00, 10.50, 10.50,
          'Rollo Tela Plana 5.0 oz',
          '["TELARES", "LAMINADO", "CORTE"]'::json,
          5.0, 'PLANA', 'N/A', null, null, '1800 - 2000', '1800 - 2000', 1.0800,
          'TODAS LAS TELAS PLANAS NO LLEVAN CINTA DE IDENTIFICACIÓN', true, NOW(), NOW()
        ),
        (
          'BOM-TEL-6.0-TUB',
          'Tela Tubular 6.0 oz/yd² Roja (1800-2000D)',
          'Tela tubular reforzada de 6.0 oz con cinta de identificación Roja Denier 2300 (3mm)',
          60.00, 78.00, 11.00, 11.00,
          'Rollo Tela Tubular 6.0 oz Roja',
          '["TELARES", "GLOBO", "LAMINADO", "CORTE"]'::json,
          6.0, 'TUBULAR', 'ROJO', 2300, 3.00, '1800 - 2000', '1800 - 2000', 1.1000,
          'CINTA DE IDENTIFICACIÓN DENIER 2300 (3mm)', true, NOW(), NOW()
        ),
        (
          'BOM-TEL-6.0-PLA',
          'Tela Plana 6.0 oz/yd² (1800-2000D)',
          'Tela plana de 6.0 oz. No lleva cinta de identificación',
          120.00, 78.00, 11.00, 11.00,
          'Rollo Tela Plana 6.0 oz',
          '["TELARES", "LAMINADO", "CORTE"]'::json,
          6.0, 'PLANA', 'N/A', null, null, '1800 - 2000', '1800 - 2000', 1.1000,
          'TODAS LAS TELAS PLANAS NO LLEVAN CINTA DE IDENTIFICACIÓN', true, NOW(), NOW()
        ),
        (
          'BOM-TEL-6.5-TUB',
          'Tela Tubular 6.5 oz/yd² Roja (2000D / 2100D)',
          'Tela tubular pesada 6.5 oz con cinta Roja Denier 2300. Restricción estricta: No denier 1800',
          65.00, 85.00, 11.50, 11.50,
          'Rollo Tela Tubular 6.5 oz Roja',
          '["TELARES", "LAMINADO", "CORTE"]'::json,
          6.5, 'TUBULAR', 'ROJO', 2300, 3.00, '2000', '2100', 1.1200,
          'RESTRICCIÓN: DE 6.5 OZ A 8.0 OZ NO SE PUEDE EMPLEAR TRAMA NI URDIMBRE DENIER 1800', true, NOW(), NOW()
        ),
        (
          'BOM-TEL-6.5-PLA',
          'Tela Plana 6.5 oz/yd² (2000D / 2100D)',
          'Tela plana pesada 6.5 oz. Restricción estricta: No denier 1800',
          130.00, 85.00, 11.50, 11.50,
          'Rollo Tela Plana 6.5 oz',
          '["TELARES", "LAMINADO", "CORTE"]'::json,
          6.5, 'PLANA', 'N/A', null, null, '2000', '2100', 1.1200,
          'RESTRICCIÓN: DE 6.5 OZ A 8.0 OZ NO SE PUEDE EMPLEAR TRAMA NI URDIMBRE DENIER 1800', true, NOW(), NOW()
        ),
        (
          'BOM-TEL-7.2-TUB',
          'Tela Tubular 7.2 oz/yd² Azul (2000-2300D / 2100D)',
          'Tela tubular super pesada 7.2 oz con cinta Azul Denier 2300. Restricción: No denier 1800',
          70.00, 95.00, 12.00, 12.00,
          'Rollo Tela Tubular 7.2 oz Azul',
          '["TELARES", "GLOBO", "LAMINADO", "CORTE"]'::json,
          7.2, 'TUBULAR', 'AZUL', 2300, 3.00, '2000 - 2300', '2100', 1.1500,
          'RESTRICCIÓN: DE 6.5 OZ A 8.0 OZ NO SE PUEDE EMPLEAR TRAMA NI URDIMBRE DENIER 1800', true, NOW(), NOW()
        ),
        (
          'BOM-TEL-7.2-PLA',
          'Tela Plana 7.2 oz/yd² (2000-2300D / 2100D)',
          'Tela plana 7.2 oz. Restricción: No denier 1800',
          140.00, 95.00, 12.00, 12.00,
          'Rollo Tela Plana 7.2 oz',
          '["TELARES", "LAMINADO", "CORTE"]'::json,
          7.2, 'PLANA', 'N/A', null, null, '2000 - 2300', '2100', 1.1500,
          'RESTRICCIÓN: DE 6.5 OZ A 8.0 OZ NO SE PUEDE EMPLEAR TRAMA NI URDIMBRE DENIER 1800', true, NOW(), NOW()
        ),
        (
          'BOM-TEL-8.0-TUB',
          'Tela Tubular 8.0 oz/yd² Azul (2000-2300D / 2100D)',
          'Tela tubular máxima resistencia 8.0 oz con cinta Azul Denier 2300. Restricción: No denier 1800',
          75.00, 105.00, 12.50, 12.50,
          'Rollo Tela Tubular 8.0 oz Azul',
          '["TELARES", "GLOBO", "LAMINADO", "CORTE"]'::json,
          8.0, 'TUBULAR', 'AZUL', 2300, 3.00, '2000 - 2300', '2100', 1.1800,
          'RESTRICCIÓN: DE 6.5 OZ A 8.0 OZ NO SE PUEDE EMPLEAR TRAMA NI URDIMBRE DENIER 1800', true, NOW(), NOW()
        )
      ON CONFLICT (code) DO UPDATE SET
        ounces_yd2 = EXCLUDED.ounces_yd2,
        fabric_type = EXCLUDED.fabric_type,
        tape_color = EXCLUDED.tape_color,
        tape_denier = EXCLUDED.tape_denier,
        weft_denier = EXCLUDED.weft_denier,
        warp_denier = EXCLUDED.warp_denier,
        cost_transformation_index = EXCLUDED.cost_transformation_index,
        general_considerations = EXCLUDED.general_considerations;
    `);

    // 9. Vincular automáticamente los items correspondientes de PTI de Extrusión a cada Tela según la matriz técnica
    await queryInterface.sequelize.query(`
      DO $$
      DECLARE
        bom_rec RECORD;
        pti_trama_1200 INTEGER;
        pti_urdimbre_1200 INTEGER;
        pti_trama_1800 INTEGER;
        pti_urdimbre_1800 INTEGER;
        pti_trama_2000 INTEGER;
        pti_urdimbre_2100 INTEGER;
        pti_trama_2300 INTEGER;
        pti_cinta_morado INTEGER;
        pti_cinta_rojo INTEGER;
      BEGIN
        -- Buscar PTIs por denier y tipo
        SELECT id INTO pti_trama_1200 FROM pti_products WHERE denier = 1200 LIMIT 1;
        SELECT id INTO pti_urdimbre_1200 FROM pti_products WHERE denier = 1200 LIMIT 1;
        SELECT id INTO pti_trama_1800 FROM pti_products WHERE denier = 1800 AND tape_type ILIKE '%trama%' LIMIT 1;
        SELECT id INTO pti_urdimbre_1800 FROM pti_products WHERE denier = 1800 AND tape_type ILIKE '%urdimbre%' LIMIT 1;
        SELECT id INTO pti_trama_2000 FROM pti_products WHERE denier = 2000 LIMIT 1;
        SELECT id INTO pti_urdimbre_2100 FROM pti_products WHERE denier = 2100 LIMIT 1;
        SELECT id INTO pti_trama_2300 FROM pti_products WHERE denier = 2300 AND tape_type ILIKE '%trama%' LIMIT 1;
        SELECT id INTO pti_cinta_morado FROM pti_products WHERE denier = 2300 AND color ILIKE '%morado%' LIMIT 1;
        SELECT id INTO pti_cinta_rojo FROM pti_products WHERE denier = 2300 AND color ILIKE '%rojo%' LIMIT 1;

        -- BOM 3.0 oz Tubular: 1200D urdimbre + 1200D trama
        FOR bom_rec IN SELECT id FROM production_boms WHERE code = 'BOM-TEL-3.0-TUB' LOOP
          DELETE FROM production_bom_items WHERE bom_id = bom_rec.id;
          IF pti_urdimbre_1200 IS NOT NULL THEN
            INSERT INTO production_bom_items (bom_id, role, pti_product_id, ratio_percentage, consumption_g_per_m, required_quantity, required_unit, notes, created_at, updated_at)
            VALUES 
              (bom_rec.id, 'URDIMBRE', pti_urdimbre_1200, 50.00, 22.50, 22.50, 'KG', 'Urdimbre 1200D', NOW(), NOW()),
              (bom_rec.id, 'TRAMA', COALESCE(pti_trama_1200, pti_urdimbre_1200), 50.00, 22.50, 22.50, 'KG', 'Trama 1200D', NOW(), NOW());
          END IF;
        END LOOP;

        -- BOM 5.0 oz Tubular: 1800-2000D urdimbre + trama + cinta verde/morado 2300D
        FOR bom_rec IN SELECT id FROM production_boms WHERE code = 'BOM-TEL-5.0-TUB' LOOP
          DELETE FROM production_bom_items WHERE bom_id = bom_rec.id;
          IF pti_urdimbre_1800 IS NOT NULL AND pti_trama_1800 IS NOT NULL THEN
            INSERT INTO production_bom_items (bom_id, role, pti_product_id, ratio_percentage, consumption_g_per_m, required_quantity, required_unit, notes, created_at, updated_at)
            VALUES 
              (bom_rec.id, 'URDIMBRE', pti_urdimbre_1800, 48.00, 31.20, 31.20, 'KG', 'Urdimbre 1800D', NOW(), NOW()),
              (bom_rec.id, 'TRAMA', pti_trama_1800, 48.00, 31.20, 31.20, 'KG', 'Trama 1800D', NOW(), NOW()),
              (bom_rec.id, 'REFUERZO', COALESCE(pti_cinta_morado, pti_trama_2300, pti_urdimbre_1800), 4.00, 2.60, 2.60, 'KG', 'Cinta Identificación Verde/Morado 2300D (3mm)', NOW(), NOW());
          END IF;
        END LOOP;

        -- BOM 6.5 oz Tubular: 2100D urdimbre + 2000D trama + cinta roja
        FOR bom_rec IN SELECT id FROM production_boms WHERE code = 'BOM-TEL-6.5-TUB' LOOP
          DELETE FROM production_bom_items WHERE bom_id = bom_rec.id;
          IF pti_urdimbre_2100 IS NOT NULL AND pti_trama_2000 IS NOT NULL THEN
            INSERT INTO production_bom_items (bom_id, role, pti_product_id, ratio_percentage, consumption_g_per_m, required_quantity, required_unit, notes, created_at, updated_at)
            VALUES 
              (bom_rec.id, 'URDIMBRE', pti_urdimbre_2100, 48.00, 40.80, 40.80, 'KG', 'Urdimbre 2100D', NOW(), NOW()),
              (bom_rec.id, 'TRAMA', pti_trama_2000, 48.00, 40.80, 40.80, 'KG', 'Trama 2000D', NOW(), NOW()),
              (bom_rec.id, 'REFUERZO', COALESCE(pti_cinta_rojo, pti_cinta_morado, pti_urdimbre_2100), 4.00, 3.40, 3.40, 'KG', 'Cinta Identificación Roja 2300D (3mm)', NOW(), NOW());
          END IF;
        END LOOP;

        -- BOM 7.2 oz Tubular: 2100D urdimbre + 2300D trama + cinta azul
        FOR bom_rec IN SELECT id FROM production_boms WHERE code = 'BOM-TEL-7.2-TUB' LOOP
          DELETE FROM production_bom_items WHERE bom_id = bom_rec.id;
          IF pti_urdimbre_2100 IS NOT NULL THEN
            INSERT INTO production_bom_items (bom_id, role, pti_product_id, ratio_percentage, consumption_g_per_m, required_quantity, required_unit, notes, created_at, updated_at)
            VALUES 
              (bom_rec.id, 'URDIMBRE', pti_urdimbre_2100, 48.00, 45.60, 45.60, 'KG', 'Urdimbre 2100D', NOW(), NOW()),
              (bom_rec.id, 'TRAMA', COALESCE(pti_trama_2300, pti_trama_2000, pti_urdimbre_2100), 48.00, 45.60, 45.60, 'KG', 'Trama 2300D', NOW(), NOW()),
              (bom_rec.id, 'REFUERZO', COALESCE(pti_cinta_morado, pti_urdimbre_2100), 4.00, 3.80, 3.80, 'KG', 'Cinta Identificación Azul 2300D (3mm)', NOW(), NOW());
          END IF;
        END LOOP;
      END $$;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE viajero_rolls
        DROP COLUMN IF EXISTS loom_number,
        DROP COLUMN IF EXISTS shift_number,
        DROP COLUMN IF EXISTS roll_sequence,
        DROP COLUMN IF EXISTS operator_nomina,
        DROP COLUMN IF EXISTS cost_transformation_index,
        DROP COLUMN IF EXISTS calculated_roll_cost,
        DROP COLUMN IF EXISTS ounces_yd2,
        DROP COLUMN IF EXISTS fabric_type,
        DROP COLUMN IF EXISTS tape_color;

      ALTER TABLE looms
        DROP COLUMN IF EXISTS loom_number,
        DROP COLUMN IF EXISTS creel_capacity_spools,
        DROP COLUMN IF EXISTS current_spools_count,
        DROP COLUMN IF EXISTS current_wip_kg,
        DROP COLUMN IF EXISTS total_rolls_produced;

      ALTER TABLE production_boms
        DROP COLUMN IF EXISTS ounces_yd2,
        DROP COLUMN IF EXISTS fabric_type,
        DROP COLUMN IF EXISTS tape_color,
        DROP COLUMN IF EXISTS tape_denier,
        DROP COLUMN IF EXISTS tape_width_mm,
        DROP COLUMN IF EXISTS weft_denier,
        DROP COLUMN IF EXISTS warp_denier,
        DROP COLUMN IF EXISTS cost_transformation_index,
        DROP COLUMN IF EXISTS general_considerations;
    `);
  }
};
