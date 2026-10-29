'use strict';

// Synchronizes only Extrusion formulas/ingredients. It never inserts, updates,
// or deletes warehouse materials, locations, inventory, or movements.
const {
  sequelize,
  Formula,
  FormulaIngredient,
  Material,
  ExtruderQueue,
} = require('../database/models');

const EXTRUDER_1_CODES = [
  'F-EXT-1-BLANCO', 'F-EXT-1-VERDE', 'F-EXT-1-AZUL', 'F-EXT-1-ROJO',
  'F-EXT-1-AMARILLO', 'F-EXT-1-NARANJA', 'F-EXT-1-NEGRO',
  'F-EXT-1-NATURAL', 'F-EXT-1-AMARILLO-ANTI',
];
const GENERAL_CODES = [
  'F-EXT-LIQ-ROJO', 'F-EXT-LIQ-NEGRO', 'F-EXT-2-BLANCA', 'F-EXT-4-BLANCA',
  'F-EXT-5-BLANCA', 'F-EXT-AZUL', 'F-EXT-VERDE', 'F-EXT-MORADO',
  'F-EXT-ROJO', 'F-EXT-NEGRO', 'F-EXT-VERDE-OPT', 'F-EXT-AMARILLO-ANTI',
  'F-EXT-NATURAL',
];
const ALL_CODES = [...EXTRUDER_1_CODES, ...GENERAL_CODES];

async function alignClientExtrusionFormulas() {
  try {
    const formulas = await Formula.findAll({ where: { code: ALL_CODES }, order: [['code', 'ASC']] });
    const foundCodes = new Set(formulas.map((formula) => formula.code));
    const missing = ALL_CODES.filter((code) => !foundCodes.has(code));
    if (missing.length) throw new Error(`Faltan fórmulas cliente en la BD: ${missing.join(', ')}`);

    const fraccional = await Material.findOne({ where: { name: 'FRACCIONAL' } });
    const pe808 = await Material.findOne({ where: { name: 'POLIETILENO 808AA' } });
    if (!fraccional || !pe808) throw new Error('Se requieren FRACCIONAL y POLIETILENO 808AA en el catálogo existente. No se crearán ni editarán materiales.');

    const formulaIds = formulas.map((formula) => formula.id);
    const pendingQueues = await ExtruderQueue.findAll({
      where: { formula_id: formulaIds, status: { [require('sequelize').Op.notIn]: ['COMPLETADA', 'CANCELADA'] } },
      attributes: ['id', 'formula_id', 'status', 'consumption_order_qr_id'],
      order: [['formula_id', 'ASC'], ['id', 'ASC']],
      raw: true,
    });
    const ingredients = await FormulaIngredient.findAll({
      where: { formula_id: formulaIds },
      include: [{ model: Material, as: 'material', attributes: ['name'] }],
    });
    const fraccionalReplacements = ingredients.filter((ingredient) =>
      EXTRUDER_1_CODES.includes(formulas.find((formula) => formula.id === ingredient.formula_id)?.code) &&
      ingredient.material?.name === 'POLIETILENO 808AA'
    );

    console.log(JSON.stringify({
      formulas: formulas.length,
      extruder1Exclusive: EXTRUDER_1_CODES.length,
      otherExtrudersExcept1: GENERAL_CODES.length,
      formulasUsingFraccionalReplacement: fraccionalReplacements.length,
      pendingQueues: pendingQueues.length,
      queueStatuses: pendingQueues.reduce((counts, queue) => ({ ...counts, [queue.status]: (counts[queue.status] || 0) + 1 }), {}),
      mode: process.argv.includes('--apply') ? 'apply' : 'dry-run',
    }, null, 2));

    if (!process.argv.includes('--apply')) return;
    if (pendingQueues.length) {
      throw new Error('No se aplicaron cambios: termina o cancela las mezclas activas/pausadas antes de cambiar las recetas para preservar su trazabilidad.');
    }

    await sequelize.transaction(async (transaction) => {
      for (const formula of formulas) {
        formula.allowed_extruders = EXTRUDER_1_CODES.includes(formula.code) ? [1] : [2, 3, 4, 5, 6];
        formula.restricted_extruders = [];
        await formula.save({ transaction });
      }
      for (const ingredient of ingredients) {
        const formula = formulas.find((entry) => entry.id === ingredient.formula_id);
        const patch = { is_restricted_on_machine_4: false, restricted_machine_ids: [] };
        if (formula && EXTRUDER_1_CODES.includes(formula.code) && ingredient.material?.name === 'POLIETILENO 808AA') {
          patch.material_id = fraccional.id;
        }
        await ingredient.update(patch, { transaction });
      }
    });
    console.log('Catálogo de Extrusión sincronizado. No se modificaron tablas de Almacén ni PTI.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) alignClientExtrusionFormulas();

module.exports = { alignClientExtrusionFormulas, EXTRUDER_1_CODES, GENERAL_CODES };
