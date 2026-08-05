const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const db = require('./src/database/models');

async function testModels() {
  try {
    console.log('Autenticando BD...');
    await db.sequelize.authenticate();
    
    console.log('1. Probando OperationalArea...');
    const [area] = await db.OperationalArea.findOrCreate({
      where: { code: 'WH' },
      defaults: { code: 'WH', name: 'Warehouse (Almacén)' }
    });
    console.log(`✅ OperationalArea creada/encontrada: ${area.name} (${area.uuid})`);

    console.log('2. Probando Catálogos (MaterialFamily y MaterialCode)...');
    const [family] = await db.MaterialFamily.findOrCreate({
      where: { code: 'SEG' },
      defaults: { code: 'SEG', name: 'Seguridad' }
    });
    console.log(`✅ MaterialFamily creada/encontrada: ${family.code}`);

    const [code] = await db.MaterialCode.findOrCreate({
      where: { code: 'GUA' },
      defaults: { code: 'GUA', name: 'Guante' }
    });
    console.log(`✅ MaterialCode creada/encontrada: ${code.code}`);

    const [category] = await db.MaterialCategory.findOrCreate({
      where: { code: 'CON' },
      defaults: { code: 'CON', name: 'Consumibles' }
    });
    
    console.log('3. Probando Creación de Material...');
    const [material, created] = await db.Material.findOrCreate({
      where: { internal_code: 'SEG-GUA-001' },
      defaults: {
        family_id: family.id,
        material_code_id: code.id,
        category_id: category.id,
        internal_consecutive: '001',
        internal_code: 'SEG-GUA-001',
        name: 'Guantes de Carnaza',
        description: 'Prueba de validación del ORM',
        status: 'DRAFT'
      }
    });
    console.log(`✅ Material probado: ${material.internal_code} - ${material.name} (UUID: ${material.uuid})`);
    
    console.log('4. Probando inmutabilidad del internal_code (Hook)...');
    try {
      material.internal_code = 'SEG-GUA-999';
      await material.save();
      console.log('❌ ERROR FATAL: El ORM permitió modificar el internal_code');
    } catch (e) {
      console.log(`✅ Hook funcionando correctamente. Bloqueó la edición: ${e.message}`);
    }

    console.log('====================================');
    console.log('🚀 FASE 1.5 COMPLETADA CON ÉXITO 🚀');
    console.log('El ORM está listo para la Fase 2.');
    
  } catch (error) {
    console.error('❌ Error durante la validación:', error);
  } finally {
    await db.sequelize.close();
  }
}

testModels();
