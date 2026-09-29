'use strict';

const FORMULAS = [
  {
    code: 'F-EXT-LIQ-ROJO',
    name: 'MEZCLA COLOR ROJO (LIQUITANK)',
    target_area_id: 1, // Assume Extrusion area ID will be matched
    target_machine: 'EXTRUSORA LIQUITANK',
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 440.6, percentage: 88.1, unit: 'KG', is_required: false },
      { name: 'POLIPROPILENO (C)', quantity: 50.0, percentage: 10.0, unit: 'KG', is_required: false },
      { name: 'PIGMENTO ROJO LYONDELLBASELL', quantity: 5.2, percentage: 1.0, unit: 'KG', is_required: true },
      { name: 'ADITIVO UV', quantity: 4.2, percentage: 0.8, unit: 'KG', is_required: true },
    ]
  },
  {
    code: 'F-EXT-LIQ-NEGRO',
    name: 'MEZCLA COLOR NEGRO (LIQUITANK)',
    target_area_id: 1,
    target_machine: 'EXTRUSORA LIQUITANK',
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 440.6, percentage: 88.1, unit: 'KG', is_required: false },
      { name: 'POLIPROPILENO (C)', quantity: 50.0, percentage: 10.0, unit: 'KG', is_required: false },
      { name: 'PIGMENTO NEGRO 40-20', quantity: 5.2, percentage: 1.0, unit: 'KG', is_required: true },
      { name: 'ADITIVO UV', quantity: 4.2, percentage: 0.8, unit: 'KG', is_required: true },
    ]
  },
  {
    code: 'F-EXT-1-BLANCO',
    name: 'BLANCO - RAFIA PARA CINTURÓN',
    target_area_id: 1,
    target_machine: 'EXTRUSORA 1',
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 335.6, percentage: 67.1, unit: 'KG', is_required: false },
      { name: 'POLIPROPILENO (B)', quantity: 100.0, percentage: 20.0, unit: 'KG', is_required: false },
      { name: 'POLIETILENO (PEBD A)', quantity: 50.0, percentage: 10.0, unit: 'KG', is_required: true },
      { name: 'CARBONATO DE CALCIO', quantity: 4.2, percentage: 0.84, unit: 'KG', is_required: true },
      { name: 'PIGMENTO BLANCO', quantity: 6.0, percentage: 1.2, unit: 'KG', is_required: true },
      { name: 'ADITIVO UV', quantity: 4.2, percentage: 0.84, unit: 'KG', is_required: true },
    ]
  },
  {
    code: 'F-EXT-1-VERDE',
    name: 'VERDE - RAFIA PARA CINTURÓN',
    target_area_id: 1,
    target_machine: 'EXTRUSORA 1',
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 340.8, percentage: 68.16, unit: 'KG', is_required: false },
      { name: 'POLIPROPILENO (B)', quantity: 100.0, percentage: 20.0, unit: 'KG', is_required: false },
      { name: 'POLIETILENO (PEBD A)', quantity: 50.0, percentage: 10.0, unit: 'KG', is_required: true },
      { name: 'CARBONATO DE CALCIO', quantity: 2.0, percentage: 0.4, unit: 'KG', is_required: true },
      { name: 'PIGMENTO VERDE', quantity: 3.0, percentage: 0.6, unit: 'KG', is_required: true },
      { name: 'ADITIVO UV', quantity: 4.2, percentage: 0.84, unit: 'KG', is_required: true },
    ]
  },
  {
    code: 'F-EXT-4-BLANCO',
    name: 'MEZCLA BLANCA EXTRUSORA 4',
    target_area_id: 1,
    target_machine: 'EXTRUSORA 4',
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 485.6, percentage: 97.12, unit: 'KG', is_required: false },
      { name: 'CARBONATO DE CALCIO', quantity: 4.2, percentage: 0.84, unit: 'KG', is_required: true },
      { name: 'PIGMENTO BLANCO', quantity: 6.0, percentage: 1.2, unit: 'KG', is_required: true },
      { name: 'ADITIVO UV', quantity: 4.2, percentage: 0.84, unit: 'KG', is_required: true },
    ]
  }
];

module.exports = {
  async up(queryInterface, Sequelize) {
    const timestamp = new Date();

    // 1. Ensure we have the Extrusión Area
    let [extrusionArea] = await queryInterface.sequelize.query(
      "SELECT id FROM areas WHERE name ILIKE '%Extrus%' LIMIT 1",
      { type: Sequelize.QueryTypes.SELECT }
    );
    if (!extrusionArea) {
      // Create it if missing
      await queryInterface.sequelize.query(
        `INSERT INTO areas (name, code, description, created_at, updated_at) 
         VALUES ('Extrusión', 'EXT', 'Área de Extrusión', NOW(), NOW())`
      );
      [extrusionArea] = await queryInterface.sequelize.query(
        "SELECT id FROM areas WHERE code = 'EXT'",
        { type: Sequelize.QueryTypes.SELECT }
      );
    }
    const areaId = extrusionArea.id;

    // 2. We need a basic unit for KG if missing
    let [unitKg] = await queryInterface.sequelize.query(
      "SELECT id FROM material_units WHERE code = 'KG'",
      { type: Sequelize.QueryTypes.SELECT }
    );
    if (!unitKg) {
      await queryInterface.sequelize.query(
        `INSERT INTO material_units (code, name, created_at, updated_at) VALUES ('KG', 'Kilogramos', NOW(), NOW())`
      );
      [unitKg] = await queryInterface.sequelize.query(
        "SELECT id FROM material_units WHERE code = 'KG'",
        { type: Sequelize.QueryTypes.SELECT }
      );
    }
    const kgUnitId = unitKg.id;

    for (const f of FORMULAS) {
      // Create Formula
      await queryInterface.sequelize.query(
        `INSERT INTO process_formulas (code, name, target_area_id, description, status, is_active, created_at, updated_at, version) 
         VALUES ('${f.code}', '${f.name}', ${areaId}, 'Para ${f.target_machine}', 'ACTIVA', true, NOW(), NOW(), 1)
         ON CONFLICT (code) DO NOTHING`
      );
      
      const [formulaRecord] = await queryInterface.sequelize.query(
        `SELECT id FROM process_formulas WHERE code = '${f.code}'`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      
      if (!formulaRecord) continue;

      let order = 1;
      for (const ing of f.ingredients) {
        // Find or create material
        let [material] = await queryInterface.sequelize.query(
          `SELECT id FROM materials WHERE name ILIKE '%${ing.name.substring(0, 5)}%' LIMIT 1`,
          { type: Sequelize.QueryTypes.SELECT }
        );
        
        if (!material) {
          [material] = await queryInterface.sequelize.query(
            `SELECT id FROM materials LIMIT 1`,
            { type: Sequelize.QueryTypes.SELECT }
          );
        }

        if (material) {
          // Insert ingredient
          await queryInterface.sequelize.query(
            `INSERT INTO process_formula_items (formula_id, material_id, material_role, calculation_type, quantity, percentage, unit, sort_order, is_required, created_at, updated_at)
             VALUES (${formulaRecord.id}, ${material.id}, 'BASE', 'FIXED_QUANTITY', ${ing.quantity}, ${ing.percentage}, '${ing.unit}', ${order}, ${ing.is_required}, NOW(), NOW())`
          );
          order++;
        }
      }
    }
  },

  async down(queryInterface, Sequelize) {
    const codes = FORMULAS.map(f => `'${f.code}'`).join(',');
    const formulas = await queryInterface.sequelize.query(
      `SELECT id FROM process_formulas WHERE code IN (${codes})`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    if (formulas.length > 0) {
      const ids = formulas.map(f => f.id).join(',');
      await queryInterface.sequelize.query(`DELETE FROM process_formula_items WHERE formula_id IN (${ids})`);
      await queryInterface.sequelize.query(`DELETE FROM process_formulas WHERE id IN (${ids})`);
    }
  }
};
