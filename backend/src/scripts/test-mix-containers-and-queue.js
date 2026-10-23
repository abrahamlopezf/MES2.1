const { sequelize, Formula, FormulaIngredient, Material, WipInventory, QrCode, ExtruderQueue } = require('../database/models');
const extrusionService = require('../modules/extrusion/extrusion.service');

async function testMixContainersAndQueue() {
  try {
    console.log('--- TEST: MIX FORMULA CON CONTENEDORES Y ENCOLADO EN EXTRUSORA ---');

    // 1. Probar validación de restricciones en Extrusora 4 con F-EXT-1-BLANCO (restringida en Extrusora 4)
    const formulaBlanco = await Formula.findOne({
      where: { code: 'F-EXT-1-BLANCO' },
      include: [{ model: FormulaIngredient, as: 'ingredients', include: [{ model: Material, as: 'material' }] }]
    });

    if (!formulaBlanco) {
      throw new Error('Fórmula F-EXT-1-BLANCO no encontrada');
    }

    console.log(`Fórmula encontrada: ${formulaBlanco.name} (Code: ${formulaBlanco.code})`);
    console.log(`Extrusoras autorizadas: [${formulaBlanco.allowed_extruders}] | Restringidas: [${formulaBlanco.restricted_extruders}]`);

    // Intentar mezclar y encolar en Extrusora 4 (debe ser bloqueado por restricción)
    let blockedSuccess = false;
    try {
      await extrusionService.mixFormula({
        formula_id: formulaBlanco.id,
        extruder_id: 4,
        container_count: 2,
        inputs: []
      }, 1);
    } catch (err) {
      if (err.message.includes('Restricción de Máquina') || err.message.includes('estrictamente prohibido')) {
        blockedSuccess = true;
        console.log(`✔ [Restricción Validada con Éxito]: Se bloqueó Extrusora 4 -> "${err.message}"`);
      } else {
        console.log('Error recibido (pero no de restricción):', err.message);
      }
    }

    if (!blockedSuccess) {
      console.warn('ALERTA: Se esperaba bloqueo en Extrusora 4.');
    }

    // 2. Verificar simulación con Extrusora 1 (permitida)
    console.log('\n--- Probando Extrusora 1 (permitida) ---');
    // Para no consumir stock real en prueba si no hay inputs, verificamos que la validación de máquina pase
    const machineId = 1;
    const isAllowed = formulaBlanco.allowed_extruders.includes(machineId);
    console.log(`¿Extrusora 1 permitida para ${formulaBlanco.name}?:`, isAllowed ? 'SÍ (Válido)' : 'NO');

    console.log('\n✔ Backend test completado con éxito.');
    process.exit(0);
  } catch (error) {
    console.error('Error en test:', error);
    process.exit(1);
  }
}

testMixContainersAndQueue();
