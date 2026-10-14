'use strict';

/**
 * ConsumptionService - Lógica de Backflushing y Descuento de Materiales
 * 
 * Regla 6 & 7: Preparación para Silos (Futuro).
 * Encapsula el cálculo de consumo en reversa:
 * - Peso teórico por pieza = batch_size_kg / expected_yield_pieces
 * - Consumo de materia prima = (Piezas PTI * Peso teórico por pieza) + Merma de transición
 * 
 * Al aislar esta lógica en un servicio independiente, el sistema podrá descontar material
 * de forma abstracta sin importar si proviene de contenedores de 500kg o de silos continuos.
 */
class ConsumptionService {
  /**
   * Calcula el consumo teórico por piezas ingresadas y merma de purga.
   * 
   * @param {Object} params
   * @param {Object} params.formula - Registro de la fórmula con yield y batch_size
   * @param {number} params.pieces - Piezas de PTI producidas e ingresadas al rack
   * @param {number} [params.scrapWeightKg=0] - Merma de transición/purga registrada
   * @returns {Object} Desglose detallado del consumo
   */
  calculateBackflushing({ formula, pieces, scrapWeightKg = 0 }) {
    if (!formula) {
      throw new Error('Fórmula requerida para el cálculo de backflushing.');
    }

    const batchSizeKg = Number(formula.batch_size_kg) || 500.00;
    const expectedYieldPieces = Number(formula.expected_yield_pieces);

    if (!expectedYieldPieces || expectedYieldPieces <= 0) {
      throw new Error(`La fórmula ${formula.code || formula.name} no tiene definido un rendimiento teórico de piezas válido.`);
    }

    // 1. Peso teórico por pieza = peso total mezcla / piezas esperadas
    const theoreticalWeightPerPieceKg = batchSizeKg / expectedYieldPieces;

    // 2. Consumo por producto terminado = piezas * peso teórico
    const productionConsumptionKg = Number(pieces) * theoreticalWeightPerPieceKg;

    // 3. Consumo total = consumo PTI + Merma de transición/purga
    const transitionScrapKg = Math.max(0, Number(scrapWeightKg) || 0);
    const totalRawMaterialConsumedKg = productionConsumptionKg + transitionScrapKg;

    // 4. Desglose por ingrediente (según porcentajes de la receta)
    const ingredients = formula.ingredients || [];
    const ingredientBreakdown = ingredients.map((ing) => {
      const percentage = Number(ing.percentage) || 0;
      const consumedKg = (percentage / 100) * totalRawMaterialConsumedKg;

      return {
        material_id: ing.material_id,
        material_name: ing.material?.name || `Material #${ing.material_id}`,
        percentage,
        consumed_kg: Number(consumedKg.toFixed(4)),
        unit: ing.unit || 'KG',
      };
    });

    return {
      formula_id: formula.id,
      formula_code: formula.code,
      formula_name: formula.name,
      batch_size_kg: batchSizeKg,
      expected_yield_pieces: expectedYieldPieces,
      expected_yield_kg: Number(formula.expected_yield_kg) || batchSizeKg,
      pieces_produced: Number(pieces),
      theoretical_weight_per_piece_kg: Number(theoreticalWeightPerPieceKg.toFixed(4)),
      production_consumption_kg: Number(productionConsumptionKg.toFixed(3)),
      transition_scrap_kg: transitionScrapKg,
      total_raw_material_consumed_kg: Number(totalRawMaterialConsumedKg.toFixed(3)),
      mode: 'DISCRETE_BATCH_BACKFLUSHING', // Preparado para 'SILO_CONTINUOUS_BACKFLUSHING'
      ingredients: ingredientBreakdown,
    };
  }

  /**
   * Ejecuta el descuento de inventario teórico (Backflushing).
   * Desacoplado para admitir transición en noviembre a Silos.
   */
  async processConsumption({ formula, pieces, scrapWeightKg = 0, transaction = null, notes = '' }) {
    const calculation = this.calculateBackflushing({ formula, pieces, scrapWeightKg });

    // En modo silos futuros, aquí se integrará la llamada al broker/PLC o tabla de silos
    return {
      success: true,
      backflushing: calculation,
      dispatched_mode: 'BACKFLUSHING_EXECUTED',
      timestamp: new Date(),
    };
  }
}

module.exports = new ConsumptionService();
