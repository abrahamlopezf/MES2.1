'use strict';
const { v4: uuidv4 } = require('uuid');

/**
 * Seeder de Pruebas: Reception Integration
 * Genera el estado exacto necesario para poder probar la Fase 4 (Recepción)
 * desde el frontend, incluyendo el Material, Lote, QR y Ubicaciones.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    
    // 1. Crear un Batch para recepción
    const [batch] = await queryInterface.bulkInsert('qr_batches', [{
      uuid: uuidv4(),
      batch_type: 'MATERIAL_RECEPTION',
      quantity: 1,
      status: 'ACTIVE',
      created_by: 1, // asumiendo superadmin id 1
      created_at: new Date(),
      updated_at: new Date()
    }], { returning: true });

    const batchId = batch.id || (await queryInterface.sequelize.query('SELECT id FROM qr_batches WHERE batch_type = "MATERIAL_RECEPTION" ORDER BY id DESC LIMIT 1'))[0][0].id;

    // 2. Crear el QR Code listo para ser escaneado
    await queryInterface.bulkInsert('qr_codes', [{
      uuid: uuidv4(),
      qr_code: 'QR-REC-001',
      purpose: 'RECEPTION',
      status: 'AVAILABLE',
      batch_id: batchId,
      created_by: 1,
      created_at: new Date(),
      updated_at: new Date()
    }]);

    // 3. Crear unidad base (Kilogramos)
    const [unit] = await queryInterface.bulkInsert('material_units', [{
      uuid: uuidv4(),
      name: 'Kilogramo',
      abbreviation: 'KG',
      base_unit: 'KG',
      conversion_factor: 1,
      created_by: 1,
      created_at: new Date(),
      updated_at: new Date()
    }], { returning: true });

    const unitId = unit?.id || (await queryInterface.sequelize.query('SELECT id FROM material_units WHERE abbreviation = "KG" LIMIT 1'))[0][0]?.id || 1;

    // 4. Asegurar que exista un Material
    // Usamos INSERT IGNORE o buscamos si existe
    const materials = await queryInterface.sequelize.query('SELECT id FROM materials WHERE code = "PP-001"');
    if (materials[0].length === 0) {
      await queryInterface.bulkInsert('materials', [{
        uuid: uuidv4(),
        code: 'PP-001',
        description: 'Polipropileno Random Copolymer',
        type_id: 1, 
        base_unit_id: unitId,
        min_stock: 100,
        max_stock: 5000,
        status: 'ACTIVE',
        created_by: 1,
        created_at: new Date(),
        updated_at: new Date()
      }]);
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('qr_codes', { qr_code: 'QR-REC-001' });
    await queryInterface.bulkDelete('qr_batches', { batch_type: 'MATERIAL_RECEPTION' });
  }
};
