'use strict';

const FORMULAS = [
  // EXCLUSIVO CLIENTE LIQUITANK
  {
    code: 'F-EXT-LIQ-ROJO', name: 'MEZCLA COLOR ROJO (LIQUITANK)', target_area_id: 1, target_machine: 'EXTRUSORA LIQUITANK',
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 440.6, percentage: 88.1, unit: 'KG', is_required: false },
      { name: 'POLIPROPILENO (C)', quantity: 50.0, percentage: 10.0, unit: 'KG', is_required: false },
      { name: 'PIGMENTO ROJO LYONDELLBASELL', quantity: 5.2, percentage: 1.0, unit: 'KG', is_required: true },
      { name: 'UV', quantity: 4.2, percentage: 0.8, unit: 'KG', is_required: true },
    ]
  },
  {
    code: 'F-EXT-LIQ-NEGRO', name: 'MEZCLA COLOR NEGRO (LIQUITANK)', target_area_id: 1, target_machine: 'EXTRUSORA LIQUITANK',
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 440.6, percentage: 88.1, unit: 'KG', is_required: false },
      { name: 'POLIPROPILENO (C)', quantity: 50.0, percentage: 10.0, unit: 'KG', is_required: false },
      { name: 'PIGMENTO NEGRO 40-20', quantity: 5.2, percentage: 1.0, unit: 'KG', is_required: true },
      { name: 'UV', quantity: 4.2, percentage: 0.8, unit: 'KG', is_required: true },
    ]
  },
  // EXTRUSORA 1 RAFIA PARA CINTURÓN
  {
    code: 'F-EXT-1-BLANCO', name: 'BLANCO - RAFIA PARA CINTURÓN', target_area_id: 1, target_machine: 'EXTRUSORA 1',
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 335.6, percentage: 67.1, unit: 'KG', is_required: false },
      { name: 'POLIPROPILENO (B)', quantity: 100.0, percentage: 20.0, unit: 'KG', is_required: false },
      { name: 'POLIETILENO (PEBD A)', quantity: 50.0, percentage: 10.0, unit: 'KG', is_required: true },
      { name: 'CARBONATO DE CALCIO', quantity: 4.2, percentage: 0.84, unit: 'KG', is_required: true },
      { name: 'PIGMENTO BLANCO', quantity: 6.0, percentage: 1.2, unit: 'KG', is_required: true },
      { name: 'UV', quantity: 4.2, percentage: 0.84, unit: 'KG', is_required: true },
    ]
  },
  {
    code: 'F-EXT-1-VERDE', name: 'VERDE - RAFIA PARA CINTURÓN', target_area_id: 1, target_machine: 'EXTRUSORA 1',
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 340.8, percentage: 68.16, unit: 'KG', is_required: false },
      { name: 'POLIPROPILENO (B)', quantity: 100.0, percentage: 20.0, unit: 'KG', is_required: false },
      { name: 'POLIETILENO (PEBD A)', quantity: 50.0, percentage: 10.0, unit: 'KG', is_required: true },
      { name: 'CARBONATO DE CALCIO', quantity: 2.0, percentage: 0.40, unit: 'KG', is_required: true },
      { name: 'PIGMENTO (VERDE)', quantity: 3.0, percentage: 0.60, unit: 'KG', is_required: true },
      { name: 'UV', quantity: 4.2, percentage: 0.84, unit: 'KG', is_required: true },
    ]
  },
  {
    code: 'F-EXT-1-AZUL', name: 'AZUL - RAFIA PARA CINTURÓN', target_area_id: 1, target_machine: 'EXTRUSORA 1',
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 339.8, percentage: 68.0, unit: 'KG', is_required: false },
      { name: 'POLIPROPILENO (B)', quantity: 100.0, percentage: 20.0, unit: 'KG', is_required: false },
      { name: 'POLIETILENO (PEBD A)', quantity: 50.0, percentage: 10.0, unit: 'KG', is_required: true },
      { name: 'CARBONATO DE CALCIO', quantity: 2.0, percentage: 0.40, unit: 'KG', is_required: true },
      { name: 'PIGMENTO (AZUL)', quantity: 4.0, percentage: 0.80, unit: 'KG', is_required: true },
      { name: 'UV', quantity: 4.2, percentage: 0.84, unit: 'KG', is_required: true },
    ]
  },
  {
    code: 'F-EXT-1-ROJO', name: 'ROJO - RAFIA PARA CINTURÓN', target_area_id: 1, target_machine: 'EXTRUSORA 1',
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 339.6, percentage: 67.9, unit: 'KG', is_required: false },
      { name: 'POLIPROPILENO (B)', quantity: 100.0, percentage: 20.0, unit: 'KG', is_required: false },
      { name: 'POLIETILENO (PEBD A)', quantity: 50.0, percentage: 10.0, unit: 'KG', is_required: true },
      { name: 'CARBONATO DE CALCIO', quantity: 2.0, percentage: 0.40, unit: 'KG', is_required: true },
      { name: 'PIGMENTO (ROJO)', quantity: 4.2, percentage: 0.84, unit: 'KG', is_required: true },
      { name: 'UV', quantity: 4.2, percentage: 0.84, unit: 'KG', is_required: true },
    ]
  },
  {
    code: 'F-EXT-1-AMARILLO', name: 'AMARILLO HUEVO - RAFIA PARA CINTURÓN', target_area_id: 1, target_machine: 'EXTRUSORA 1',
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 337.8, percentage: 67.56, unit: 'KG', is_required: false },
      { name: 'POLIPROPILENO (B)', quantity: 100.0, percentage: 20.0, unit: 'KG', is_required: false },
      { name: 'POLIETILENO (PEBD A)', quantity: 50.0, percentage: 10.0, unit: 'KG', is_required: true },
      { name: 'CARBONATO DE CALCIO', quantity: 2.0, percentage: 0.4, unit: 'KG', is_required: true },
      { name: 'PIGMENTO (AMARILLO HUEVO)', quantity: 6.0, percentage: 1.2, unit: 'KG', is_required: true },
      { name: 'UV', quantity: 4.2, percentage: 0.84, unit: 'KG', is_required: true },
    ]
  },
  {
    code: 'F-EXT-1-NARANJA', name: 'NARANJA - RAFIA PARA CINTURÓN', target_area_id: 1, target_machine: 'EXTRUSORA 1',
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 340.0, percentage: 68.0, unit: 'KG', is_required: false },
      { name: 'POLIPROPILENO (B)', quantity: 100.0, percentage: 20.0, unit: 'KG', is_required: false },
      { name: 'POLIETILENO (PEBD A)', quantity: 50.0, percentage: 10.0, unit: 'KG', is_required: true },
      { name: 'CARBONATO DE CALCIO', quantity: 2.0, percentage: 0.4, unit: 'KG', is_required: true },
      { name: 'PIGMENTO (NARANJA)', quantity: 3.8, percentage: 0.8, unit: 'KG', is_required: true },
      { name: 'UV', quantity: 4.2, percentage: 0.84, unit: 'KG', is_required: true },
    ]
  },
  {
    code: 'F-EXT-1-NEGRO', name: 'NEGRO - RAFIA PARA CINTURÓN', target_area_id: 1, target_machine: 'EXTRUSORA 1',
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 334.8, percentage: 67.0, unit: 'KG', is_required: false },
      { name: 'POLIPROPILENO (B)', quantity: 100.0, percentage: 20.0, unit: 'KG', is_required: false },
      { name: 'POLIETILENO (PEBD A)', quantity: 50.0, percentage: 10.0, unit: 'KG', is_required: true },
      { name: 'PIGMENTO', quantity: 11.0, percentage: 2.2, unit: 'KG', is_required: true },
      { name: 'UV', quantity: 4.2, percentage: 0.84, unit: 'KG', is_required: true },
    ]
  },
  {
    code: 'F-EXT-1-NATURAL', name: 'NATURAL ANTIESTÁTICO - RAFIA PARA CINTURÓN', target_area_id: 1, target_machine: 'EXTRUSORA 1',
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 334.8, percentage: 67.0, unit: 'KG', is_required: false },
      { name: 'POLIPROPILENO (B)', quantity: 100.0, percentage: 20.0, unit: 'KG', is_required: false },
      { name: 'POLIETILENO (PEBD A)', quantity: 50.0, percentage: 10.0, unit: 'KG', is_required: true },
      { name: 'CONCENTRADO AE-18', quantity: 11.0, percentage: 2.2, unit: 'KG', is_required: true },
      { name: 'UV', quantity: 4.2, percentage: 0.84, unit: 'KG', is_required: true },
    ]
  },
  {
    code: 'F-EXT-1-AMARILLO-ANTI', name: 'AMARILLO ANTIESTÁTICO - RAFIA PARA CINTURÓN', target_area_id: 1, target_machine: 'EXTRUSORA 1',
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 335.0, percentage: 67.0, unit: 'KG', is_required: false },
      { name: 'POLIETILENO (PEBD A)', quantity: 50.0, percentage: 10.0, unit: 'KG', is_required: true },
      { name: 'POLIPROPILENO ( B )', quantity: 100.0, percentage: 20.0, unit: 'KG', is_required: false },
      { name: 'CONCENTRADO AE-18', quantity: 11.0, percentage: 2.2, unit: 'KG', is_required: true },
      { name: 'PIGMENTO (AMARILLO HUEVO)', quantity: 1.0, percentage: 0.2, unit: 'KG', is_required: true },
      { name: 'UV', quantity: 3.0, percentage: 0.6, unit: 'KG', is_required: true },
    ]
  },
  // OTRAS EXTRUSORAS Y GENERALES
  {
    code: 'F-EXT-2-BLANCA', name: 'MEZCLA BLANCA EXTRUSORA 2', target_area_id: 1, target_machine: 'EXTRUSORA 2',
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 385.6, percentage: 77.12, unit: 'KG', is_required: false },
      { name: 'POLIPROPILENO (B)', quantity: 100.0, percentage: 20.0, unit: 'KG', is_required: false },
      { name: 'CARBONATO DE CALCIO', quantity: 4.2, percentage: 0.84, unit: 'KG', is_required: true },
      { name: 'PIGMENTO BLANCO', quantity: 6.0, percentage: 1.20, unit: 'KG', is_required: true },
      { name: 'UV', quantity: 4.2, percentage: 0.84, unit: 'KG', is_required: true },
    ]
  },
  {
    code: 'F-EXT-4-BLANCO', name: 'MEZCLA BLANCA EXTRUSORA 4', target_area_id: 1, target_machine: 'EXTRUSORA 4',
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 485.6, percentage: 97.12, unit: 'KG', is_required: false },
      { name: 'CARBONATO DE CALCIO', quantity: 4.2, percentage: 0.84, unit: 'KG', is_required: true },
      { name: 'PIGMENTO (BLANCO)', quantity: 6.0, percentage: 1.2, unit: 'KG', is_required: true },
      { name: 'UV', quantity: 4.2, percentage: 0.84, unit: 'KG', is_required: true },
    ]
  },
  {
    code: 'F-EXT-5-BLANCA', name: 'MEZCLA BLANCA EXTRUSORA 5', target_area_id: 1, target_machine: 'EXTRUSORA 5',
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 385.6, percentage: 77.12, unit: 'KG', is_required: false },
      { name: 'POLIPROPILENO (B)', quantity: 100.0, percentage: 20.0, unit: 'KG', is_required: false },
      { name: 'CARBONATO DE CALCIO', quantity: 4.2, percentage: 0.84, unit: 'KG', is_required: true },
      { name: 'PIGMENTO (BLANCO)', quantity: 6.0, percentage: 1.2, unit: 'KG', is_required: true },
      { name: 'UV', quantity: 4.2, percentage: 0.84, unit: 'KG', is_required: true },
    ]
  },
  // OTRAS MEZCLAS GENERALES (ASUMO SIN MÁQUINA FIJA O GENERALES)
  {
    code: 'F-EXT-AZUL', name: 'MEZCLA COLOR AZUL', target_area_id: 1, target_machine: '',
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 490.0, percentage: 98.0, unit: 'KG', is_required: false },
      { name: 'CARBONATO DE CALCIO', quantity: 2.0, percentage: 0.4, unit: 'KG', is_required: true },
      { name: 'PIGMENTO', quantity: 3.8, percentage: 0.76, unit: 'KG', is_required: true },
      { name: 'UV', quantity: 4.2, percentage: 0.84, unit: 'KG', is_required: true },
    ]
  },
  {
    code: 'F-EXT-VERDE', name: 'MEZCLA COLOR VERDE', target_area_id: 1, target_machine: '',
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 492.8, percentage: 98.56, unit: 'KG', is_required: false },
      { name: 'PIGMENTO', quantity: 3.0, percentage: 0.6, unit: 'KG', is_required: true },
      { name: 'UV', quantity: 4.2, percentage: 0.84, unit: 'KG', is_required: true },
    ]
  },
  {
    code: 'F-EXT-MORADO', name: 'MEZCLA COLOR MORADO', target_area_id: 1, target_machine: '',
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 492.3, percentage: 98.46, unit: 'KG', is_required: false },
      { name: 'PIGMENTO', quantity: 3.5, percentage: 0.7, unit: 'KG', is_required: true },
      { name: 'UV', quantity: 4.2, percentage: 0.84, unit: 'KG', is_required: true },
    ]
  },
  {
    code: 'F-EXT-ROJO', name: 'MEZCLA COLOR ROJO', target_area_id: 1, target_machine: '',
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 491.6, percentage: 98.32, unit: 'KG', is_required: false },
      { name: 'PIGMENTO', quantity: 4.2, percentage: 0.84, unit: 'KG', is_required: true },
      { name: 'UV', quantity: 4.2, percentage: 0.84, unit: 'KG', is_required: true },
    ]
  },
  {
    code: 'F-EXT-NEGRO', name: 'MEZCLA COLOR NEGRO', target_area_id: 1, target_machine: '',
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 382.8, percentage: 76.56, unit: 'KG', is_required: false },
      { name: 'POLIPROPILENO ( B )', quantity: 100.0, percentage: 20.0, unit: 'KG', is_required: false },
      { name: 'CARBONATO DE CALCIO', quantity: 2.0, percentage: 0.4, unit: 'KG', is_required: true },
      { name: 'PIGMENTO', quantity: 11.0, percentage: 2.2, unit: 'KG', is_required: true },
      { name: 'UV', quantity: 4.2, percentage: 0.84, unit: 'KG', is_required: true },
    ]
  },
  {
    code: 'F-EXT-VERDE-OPT', name: 'MEZCLA COLOR VERDE ÓPTICO', target_area_id: 1, target_machine: '',
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 384.8, percentage: 76.96, unit: 'KG', is_required: false },
      { name: 'POLIPROPILENO (B)', quantity: 100.0, percentage: 20.0, unit: 'KG', is_required: false },
      { name: 'CARBONATO DE CALCIO', quantity: 2.0, percentage: 0.4, unit: 'KG', is_required: true },
      { name: 'PIGMENTO VERDE ÓPTICO', quantity: 4.0, percentage: 0.8, unit: 'KG', is_required: true },
      { name: 'PIGMENTO AMARILLO', quantity: 5.0, percentage: 1.0, unit: 'KG', is_required: true },
      { name: 'UV', quantity: 4.2, percentage: 0.84, unit: 'KG', is_required: true },
    ]
  },
  {
    code: 'F-EXT-AMARILLO-ANTI', name: 'MEZCLA AMARILLO ANTIESTÁTICO', target_area_id: 1, target_machine: '',
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 484.0, percentage: 96.8, unit: 'KG', is_required: false },
      { name: 'CARBONATO DE CALCIO', quantity: 1.0, percentage: 0.2, unit: 'KG', is_required: true },
      { name: 'PIGMENTO AMARILLO HUEVO', quantity: 1.0, percentage: 0.2, unit: 'KG', is_required: true },
      { name: 'CONCENTRADO AE-18', quantity: 11.0, percentage: 2.2, unit: 'KG', is_required: true },
      { name: 'UV', quantity: 3.0, percentage: 0.6, unit: 'KG', is_required: true },
    ]
  },
  {
    code: 'F-EXT-NATURAL', name: 'MEZCLA CINTA COLOR NATURAL', target_area_id: 1, target_machine: '',
    ingredients: [
      { name: 'POLIPROPILENO (A)', quantity: 495.8, percentage: 99.16, unit: 'KG', is_required: false },
      { name: 'UV', quantity: 4.2, percentage: 0.84, unit: 'KG', is_required: true },
    ]
  },
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

    for (const f of FORMULAS) {
      // Create Formula
      await queryInterface.sequelize.query(
        `INSERT INTO process_formulas (code, name, target_area_id, description, status, is_active, created_at, updated_at, version) 
         VALUES ('${f.code}', '${f.name}', ${areaId}, 'Para ${f.target_machine || 'General'}', 'ACTIVA', true, NOW(), NOW(), 1)
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
