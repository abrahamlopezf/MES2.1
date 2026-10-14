'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Asegurar existencia de material POLIPROPILENO (B)
    const [existingPpb] = await queryInterface.sequelize.query(`
      SELECT id FROM materials WHERE name = 'POLIPROPILENO (B)' AND deleted_at IS NULL LIMIT 1;
    `);

    let ppbId;
    if (existingPpb && existingPpb.length > 0) {
      ppbId = existingPpb[0].id;
    } else {
      const [insertPpb] = await queryInterface.sequelize.query(`
        INSERT INTO materials (
          family_id, material_code_id, internal_consecutive, internal_code,
          name, description, brand_id, type_id, default_location_id,
          status, is_active, created_at, updated_at, version
        ) VALUES (
          43, 8708, '008', 'MP-POL-008',
          'POLIPROPILENO (B)', 'Resina Polipropileno Tipo B de alta densidad', 34, 4120, 50,
          'ACTIVE', true, NOW(), NOW(), 1
        ) RETURNING id;
      `);
      ppbId = insertPpb[0].id;
    }

    // Material base normal
    const [basePp] = await queryInterface.sequelize.query(`
      SELECT id FROM materials WHERE name = 'POLIPROPILENO' AND deleted_at IS NULL LIMIT 1;
    `);
    const ppNormalId = basePp && basePp.length > 0 ? basePp[0].id : ppbId;

    // Material carbonato
    const [carbMat] = await queryInterface.sequelize.query(`
      SELECT id FROM materials WHERE name ILIKE '%CARBONATO%' AND deleted_at IS NULL LIMIT 1;
    `);
    const carbId = carbMat && carbMat.length > 0 ? carbMat[0].id : ppNormalId;

    // 2. Fórmulas de Extrusión
    const [f1] = await queryInterface.sequelize.query(`
      INSERT INTO formulas (
        code, name, description, batch_size_kg, expected_yield_pieces, expected_yield_kg,
        allowed_extruders, restricted_extruders, is_active, created_at, updated_at
      ) VALUES (
        'F-EXT-01-FIXED', 'Fórmula Fija Rafia 500kg (Extrusora 1)',
        'Receta fija estándar para cinturón/rafia en Extrusora 1', 500.00, 5000.00, 490.00,
        '[1]', '[]', true, NOW(), NOW()
      ) ON CONFLICT (code) DO UPDATE SET
        expected_yield_pieces = EXCLUDED.expected_yield_pieces,
        expected_yield_kg = EXCLUDED.expected_yield_kg
      RETURNING id;
    `);
    const f1Id = f1[0].id;

    const [f2] = await queryInterface.sequelize.query(`
      INSERT INTO formulas (
        code, name, description, batch_size_kg, expected_yield_pieces, expected_yield_kg,
        allowed_extruders, restricted_extruders, is_active, created_at, updated_at
      ) VALUES (
        'F-EXT-DIN-STD', 'Fórmula Dinámica Estándar 500kg (Ext 3, 4, 5)',
        'Receta de alto rendimiento para extrusoras dinámicas', 500.00, 4800.00, 485.00,
        '[1, 3, 4, 5]', '[]', true, NOW(), NOW()
      ) ON CONFLICT (code) DO UPDATE SET
        expected_yield_pieces = EXCLUDED.expected_yield_pieces,
        expected_yield_kg = EXCLUDED.expected_yield_kg
      RETURNING id;
    `);
    const f2Id = f2[0].id;

    const [f3] = await queryInterface.sequelize.query(`
      INSERT INTO formulas (
        code, name, description, batch_size_kg, expected_yield_pieces, expected_yield_kg,
        allowed_extruders, restricted_extruders, is_active, created_at, updated_at
      ) VALUES (
        'F-EXT-DIN-PPB', 'Fórmula Polipropileno B (Prohibida en Extrusora 4)',
        'Fórmula que incluye Polipropileno (B). BLOQUEADA ESTRICTAMENTE en Máquina 4', 500.00, 4500.00, 480.00,
        '[1, 3, 5]', '[4]', true, NOW(), NOW()
      ) ON CONFLICT (code) DO UPDATE SET
        expected_yield_pieces = EXCLUDED.expected_yield_pieces,
        expected_yield_kg = EXCLUDED.expected_yield_kg
      RETURNING id;
    `);
    const f3Id = f3[0].id;

    // 3. Ingredientes de fórmulas
    await queryInterface.sequelize.query(`DELETE FROM formula_ingredients WHERE formula_id IN (${f1Id}, ${f2Id}, ${f3Id});`);

    await queryInterface.sequelize.query(`
      INSERT INTO formula_ingredients (formula_id, material_id, quantity, percentage, unit, is_restricted_on_machine_4, restricted_machine_ids, created_at, updated_at) VALUES
      (${f1Id}, ${ppNormalId}, 485.00, 97.00, 'KG', false, '[]', NOW(), NOW()),
      (${f1Id}, ${carbId}, 15.00, 3.00, 'KG', false, '[]', NOW(), NOW()),

      (${f2Id}, ${ppNormalId}, 480.00, 96.00, 'KG', false, '[]', NOW(), NOW()),
      (${f2Id}, ${carbId}, 20.00, 4.00, 'KG', false, '[]', NOW(), NOW()),

      (${f3Id}, ${ppbId}, 480.00, 96.00, 'KG', true, '[4]', NOW(), NOW()),
      (${f3Id}, ${carbId}, 20.00, 4.00, 'KG', false, '[]', NOW(), NOW());
    `);

    // 4. Racks de PTI
    await queryInterface.sequelize.query(`
      INSERT INTO pti_racks (rack_code, qr_code, current_pti_type_id, current_quantity, min_capacity, max_capacity, status, location_name, created_at, updated_at)
      VALUES
        ('RACK-PTI-01', 'QR-RACK-001', NULL, 0.00, 0, 100, 'VACIO', 'Pasillo A - Extrusión', NOW(), NOW()),
        ('RACK-PTI-02', 'QR-RACK-002', ${ppNormalId}, 35.00, 0, 100, 'DISPONIBLE', 'Pasillo A - Extrusión', NOW(), NOW()),
        ('RACK-PTI-03', 'QR-RACK-003', ${ppNormalId}, 100.00, 0, 100, 'LLENO', 'Pasillo B - Extrusión', NOW(), NOW()),
        ('RACK-PTI-04', 'QR-RACK-004', NULL, 0.00, 0, 120, 'VACIO', 'Pasillo B - Extrusión', NOW(), NOW())
      ON CONFLICT (qr_code) DO NOTHING;
    `);

    // 5. Colas Iniciales para Extrusoras 1, 3, 4, 5
    await queryInterface.sequelize.query(`
      INSERT INTO extruder_queues (extruder_id, consumption_order_qr_id, formula_id, priority, status, notes, created_at, updated_at)
      VALUES
        (1, 'ORD-202610-001-QR', ${f1Id}, 10, 'ACTIVA', 'Mezcla fija para cinturón en proceso', NOW(), NOW()),
        (1, 'ORD-202610-002-QR', ${f1Id}, 5, 'EN_ESPERA', 'Segundo lote programado', NOW(), NOW()),

        (3, 'ORD-202610-003-QR', ${f2Id}, 8, 'ACTIVA', 'Corrida estándar 4800 piezas', NOW(), NOW()),
        (3, 'ORD-202610-004-QR', ${f2Id}, 4, 'EN_ESPERA', 'En espera de inicio', NOW(), NOW()),

        (4, 'ORD-202610-005-QR', ${f2Id}, 9, 'ACTIVA', 'Mezcla permitida en Extrusora 4', NOW(), NOW()),
        (4, 'ORD-202610-006-QR', ${f2Id}, 3, 'EN_ESPERA', 'Lote de respaldo', NOW(), NOW()),

        (5, 'ORD-202610-007-QR', ${f3Id}, 7, 'ACTIVA', 'Mezcla con PP-B (autorizada en Extrusora 5)', NOW(), NOW()),
        (5, 'ORD-202610-008-QR', ${f2Id}, 2, 'EN_ESPERA', 'Cola estándar', NOW(), NOW())
      ON CONFLICT DO NOTHING;
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`DELETE FROM extruder_queues WHERE consumption_order_qr_id LIKE 'ORD-202610-%';`);
    await queryInterface.sequelize.query(`DELETE FROM pti_racks WHERE qr_code IN ('QR-RACK-001', 'QR-RACK-002', 'QR-RACK-003', 'QR-RACK-004');`);
    await queryInterface.sequelize.query(`DELETE FROM formula_ingredients WHERE unit = 'KG';`);
    await queryInterface.sequelize.query(`DELETE FROM formulas WHERE code IN ('F-EXT-01-FIXED', 'F-EXT-DIN-STD', 'F-EXT-DIN-PPB');`);
  }
};
