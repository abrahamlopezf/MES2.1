'use strict';

/**
 * ConsumptionService - Lógica de Backflushing y Descuento de Materiales
 * 
 * Soporta dos modalidades:
 * 1. modo_silo = false (Manual):
 *    - La mezcla completa (PP + Aditivos) fue solicitada con QR a almacén.
 *    - El consumo descuenta del lote/contenedor padre.
 * 2. modo_silo = true (Automatizado por Silos):
 *    - La orden en piso es un "Kit de Aditivos" (sin PP).
 *    - El PP se descuenta de forma automatizada del Silo asignado vía Backflushing.
 *    - La merma de arranque se deduce al 100% de la mezcla entrante / Silo de PP.
 *    - Trazabilidad Financiera: El costo del kit de aditivos entró en WIP al surtirse,
 *      y el costo del PP del silo se suma al PTI exactamente al reportar producción.
 */
class ConsumptionService {
  /**
   * Identifica si un ingrediente es resina de Polipropileno base
   * @param {Object} ingredient
   * @returns {boolean}
   */
  isPpMaterial(ingredient) {
    const matName = (ingredient.material?.name || ingredient.material_name || '').toUpperCase();
    return matName.includes('POLIPROPILENO');
  }

  /**
   * Calcula el consumo teórico por piezas ingresadas y merma de purga / arranque.
   * 
   * @param {Object} params
   * @param {Object} params.formula - Registro de la fórmula con yield y batch_size
   * @param {number} params.pieces - Piezas de PTI producidas e ingresadas al rack
   * @param {number} [params.scrapWeightKg=0] - Merma de transición/purga/arranque registrada
   * @param {boolean} [params.isSiloMode=false] - Indica si la máquina corre en modo silo
   * @param {Object} [params.silo=null] - Registro del Silo asignado a la extrusora
   * @returns {Object} Desglose detallado del consumo y trazabilidad de costos
   */
  calculateBackflushing({ formula, pieces, scrapWeightKg = 0, isSiloMode = false, silo = null }) {
    if (!formula) {
      throw new Error('Fórmula requerida para el cálculo de backflushing.');
    }

    const batchSizeKg = Number(formula.batch_size_kg) || 500.00;
    const expectedYieldPieces = Number(formula.expected_yield_pieces);

    if (!expectedYieldPieces || expectedYieldPieces <= 0) {
      throw new Error(`La fórmula ${formula.code || formula.name} no tiene definido un rendimiento teórico de piezas válido.`);
    }

    // 1. Peso teórico total por pieza = peso total mezcla / piezas esperadas
    const theoreticalWeightPerPieceKg = batchSizeKg / expectedYieldPieces;

    // 2. Consumo por producto terminado = piezas * peso teórico
    const productionConsumptionKg = Number(pieces) * theoreticalWeightPerPieceKg;

    // 3. Merma de transición / arranque
    const transitionScrapKg = Math.max(0, Number(scrapWeightKg) || 0);
    const totalRawMaterialConsumedKg = productionConsumptionKg + transitionScrapKg;

    // 4. Desglose detallado por ingrediente (PP vs Aditivos)
    const ingredients = formula.ingredients || [];
    let ppPercentage = 0;
    let additivesPercentage = 0;

    ingredients.forEach(ing => {
      const pct = Number(ing.percentage) || 0;
      if (this.isPpMaterial(ing)) {
        ppPercentage += pct;
      } else {
        additivesPercentage += pct;
      }
    });

    // Si la suma no es 100 por redondeo, normalizar
    if (ppPercentage + additivesPercentage === 0) {
      ppPercentage = 96.0;
      additivesPercentage = 4.0;
    }

    // En modo_silo:
    // La merma de arranque se aplica 100% al Polipropileno de la mezcla entrante
    const ppFromProductionKg = (productionConsumptionKg * (ppPercentage / 100));
    const ppFromScrapKg = transitionScrapKg * 1.0; // 100% de merma de arranque deducida de la mezcla entrante
    const totalPpConsumedKg = Number((ppFromProductionKg + ppFromScrapKg).toFixed(3));

    const totalAdditivesConsumedKg = Number((productionConsumptionKg * (additivesPercentage / 100)).toFixed(3));

    const ingredientBreakdown = ingredients.map((ing) => {
      const percentage = Number(ing.percentage) || 0;
      const isPp = this.isPpMaterial(ing);
      let consumedKg = 0;

      if (isSiloMode) {
        if (isPp) {
          const share = ppPercentage > 0 ? percentage / ppPercentage : 1;
          consumedKg = totalPpConsumedKg * share;
        } else {
          const share = additivesPercentage > 0 ? percentage / additivesPercentage : 1;
          consumedKg = totalAdditivesConsumedKg * share;
        }
      } else {
        consumedKg = (percentage / 100) * totalRawMaterialConsumedKg;
      }

      return {
        material_id: ing.material_id,
        material_name: ing.material?.name || `Material #${ing.material_id}`,
        percentage,
        is_pp: isPp,
        source: (isSiloMode && isPp) ? 'SILO_AUTOMATED' : 'WIP_KIT_QR',
        consumed_kg: Number(consumedKg.toFixed(4)),
        unit: ing.unit || 'KG',
      };
    });

    // 5. Trazabilidad Financiera (Costos del Batch y PTI)
    const formulaCostIndex = Number(formula.cost_index) > 0 ? Number(formula.cost_index) : 1.15;
    const siloUnitCost = silo ? Number(silo.unit_cost || 28.5) : 28.5;

    // Costo del PP consumido en este reporte
    const ppFinancialCost = Number((totalPpConsumedKg * siloUnitCost * formulaCostIndex).toFixed(2));

    return {
      formula_id: formula.id,
      formula_code: formula.code,
      formula_name: formula.name,
      cost_index: formulaCostIndex,
      batch_size_kg: batchSizeKg,
      expected_yield_pieces: expectedYieldPieces,
      expected_yield_kg: Number(formula.expected_yield_kg) || batchSizeKg,
      pieces_produced: Number(pieces),
      theoretical_weight_per_piece_kg: Number(theoreticalWeightPerPieceKg.toFixed(4)),
      production_consumption_kg: Number(productionConsumptionKg.toFixed(3)),
      transition_scrap_kg: transitionScrapKg,
      total_raw_material_consumed_kg: Number(totalRawMaterialConsumedKg.toFixed(3)),
      is_silo_mode: Boolean(isSiloMode),
      silo_info: silo ? {
        silo_id: silo.id,
        silo_code: silo.code,
        silo_name: silo.name,
        current_lot_type: silo.current_lot_type,
        current_lot_number: silo.current_lot_number,
        unit_cost: siloUnitCost,
      } : null,
      pp_breakdown: {
        percentage: Number(ppPercentage.toFixed(2)),
        production_pp_kg: Number(ppFromProductionKg.toFixed(3)),
        startup_scrap_pp_kg: Number(ppFromScrapKg.toFixed(3)),
        total_pp_deducted_kg: totalPpConsumedKg,
        pp_financial_cost_applied: ppFinancialCost,
      },
      additives_breakdown: {
        percentage: Number(additivesPercentage.toFixed(2)),
        total_additives_consumed_kg: totalAdditivesConsumedKg,
      },
      ingredients: ingredientBreakdown,
      mode: isSiloMode ? 'SILO_CONTINUOUS_BACKFLUSHING' : 'DISCRETE_BATCH_BACKFLUSHING',
    };
  }

  /**
   * Ejecuta el descuento de inventario teórico (Backflushing) en la base de datos.
   * En modo silo, descuenta el PP automáticamente de la tabla silos.
   */
  async processConsumption({ formula, pieces, scrapWeightKg = 0, isSiloMode = false, extruderId = null, transaction = null, notes = '', userId = 1 }) {
    const { Silo, Extruder, InventoryMovement, TraceabilityEvent } = require('../../../database/models');

    let silo = null;
    let extruder = null;

    if (extruderId) {
      extruder = await Extruder.findByPk(extruderId, {
        include: [{ model: Silo, as: 'silo' }],
        transaction
      });
      if (extruder && extruder.silo) {
        silo = extruder.silo;
      }
    }

    if (!silo && isSiloMode) {
      silo = await Silo.findOne({ where: { is_active: true }, transaction });
    }

    const calculation = this.calculateBackflushing({
      formula,
      pieces,
      scrapWeightKg,
      isSiloMode,
      silo
    });

    let siloDeductionResult = null;

    if (isSiloMode && silo) {
      const ppToDeduct = calculation.pp_breakdown.total_pp_deducted_kg;
      const initialStock = Number(silo.current_stock_kg);
      const newStock = Math.max(0, initialStock - ppToDeduct);

      silo.current_stock_kg = Number(newStock.toFixed(2));
      await silo.save({ transaction });

      // Registrar movimiento de auditoría en inventory_movements
      if (silo.material_id) {
        await InventoryMovement.create({
          material_id: silo.material_id,
          movement_type: 'EXIT',
          quantity: ppToDeduct,
          balance_after: newStock,
          notes: notes || `Consumo Backflushing Silo ${silo.code} en Extrusora ${extruderId || 'N/A'} (${pieces} bobinas PTI + ${scrapWeightKg}kg merma de arranque).`,
          created_by: userId || 1
        }, { transaction });
      }

      siloDeductionResult = {
        silo_id: silo.id,
        silo_code: silo.code,
        silo_name: silo.name,
        initial_stock_kg: initialStock,
        deducted_kg: ppToDeduct,
        final_stock_kg: Number(newStock.toFixed(2)),
        unit_cost: Number(silo.unit_cost),
        applied_cost: calculation.pp_breakdown.pp_financial_cost_applied
      };
    }

    return {
      success: true,
      backflushing: calculation,
      silo_deduction: siloDeductionResult,
      dispatched_mode: isSiloMode ? 'SILO_BACKFLUSHING_EXECUTED' : 'DISCRETE_BACKFLUSHING_EXECUTED',
      timestamp: new Date(),
    };
  }
}

module.exports = new ConsumptionService();
