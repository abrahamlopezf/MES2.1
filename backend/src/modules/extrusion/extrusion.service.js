const { sequelize, ProcessFormula, ProcessFormulaItem, ProcessPreparation, ProcessPreparationInput, WipInventory, QrCode, QrBatch, TraceabilityEvent, TraceabilityMovement, TraceabilityLink, Lote, Area, TraceableItem, Material } = require('../../database/models');

class ExtrusionService {
  validatePausedQueueScan(targetQueue, scannedQr) {
    if (targetQueue?.status !== 'PAUSADA') return true;
    const expected = String(targetQueue.consumption_order_qr_id || '').trim().toUpperCase();
    const scanned = String(scannedQr || '').trim().toUpperCase();
    if (!expected || scanned !== expected) {
      throw Object.assign(new Error('Para reanudar una mezcla pausada debes escanear el QR original del contenedor.'), { statusCode: 400 });
    }
    return true;
  }

  async reconcilePurgeMaterialStock({ loteId, quantityDelta, userId, transaction, reason }) {
    const delta = Number(quantityDelta);
    if (!Number.isFinite(delta) || Math.abs(delta) < 0.0005) return;
    const { Inventory, InventoryMovement, Lote: Lot } = require('../../database/models');
    const lote = await Lot.findByPk(loteId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!lote || !lote.is_active || lote.is_frozen) {
      throw Object.assign(new Error('El lote de purga ya no está disponible para ajustar existencias.'), { statusCode: 409 });
    }
    const inventory = await Inventory.findOne({ where: { material_id: lote.material_id }, transaction, lock: transaction.LOCK.UPDATE });
    if (!inventory) throw Object.assign(new Error('No existe inventario de Almacén para el material de purga.'), { statusCode: 409 });
    const lotBalance = Number(lote.available_amount || 0);
    const inventoryBalance = Number(inventory.amount || 0);
    if (delta > 0 && (lotBalance + 0.0005 < delta || inventoryBalance + 0.0005 < delta)) {
      throw Object.assign(new Error(`Existencia insuficiente para purga. Lote: ${lotBalance.toFixed(3)} kg; Almacén: ${inventoryBalance.toFixed(3)} kg; requerido: ${delta.toFixed(3)} kg.`), { statusCode: 409 });
    }
    if (delta < 0 && (lotBalance - delta > Number(lote.initial_amount) + 0.0005)) {
      throw Object.assign(new Error('El ajuste de pesaje devolvería al lote más material del que tenía registrado inicialmente.'), { statusCode: 409 });
    }
    if (!userId) throw Object.assign(new Error('Se requiere un usuario autenticado para registrar el movimiento de material de purga.'), { statusCode: 401 });
    const signed = Number((-delta).toFixed(3));
    lote.available_amount = Number((lotBalance - delta).toFixed(3));
    inventory.amount = Number((inventoryBalance - delta).toFixed(3));
    await lote.save({ transaction });
    await inventory.save({ transaction });
    await InventoryMovement.create({
      inventory_id: inventory.id,
      type: delta > 0 ? 'CONSUMPTION' : 'DEVOLUCION',
      quantity_change: signed,
      performed_by: userId,
      notes: `${reason || 'Purga de extrusión'}; lote ${lote.folio}; ${Math.abs(delta).toFixed(3)} kg ${delta > 0 ? 'consumidos' : 'devueltos'}.`,
      unit_cost: lote.unit_cost == null ? null : Number(lote.unit_cost),
      total_cost: lote.unit_cost == null ? null : Number((Math.abs(delta) * Number(lote.unit_cost)).toFixed(4)),
    }, { transaction });
  }

  async mixFormula(payload, userId) {
    return sequelize.transaction(async (transaction) => {
      const { formula_id, preparation_id, destination_qr_code, container_count = 1, extruder_id, silo_id, silo_inputs = [], inputs, area_id, notes } = payload;
      let effectiveAreaId = area_id;
      if (!effectiveAreaId) {
        const extrusionArea = await Area.findOne({ where: { code: 'EXTRUSION' }, transaction });
        effectiveAreaId = extrusionArea ? extrusionArea.id : 2;
      }

      // 1. Validar Fórmula (soporta tanto Formula oficial como ProcessFormula)
      const { Formula, FormulaIngredient } = require('../../database/models');
      let formula = await Formula.findByPk(formula_id, {
        include: [{
          model: FormulaIngredient,
          as: 'ingredients',
          include: [{ model: Material, as: 'material' }],
        }],
        transaction
      });
      const isOfficialExtrusionFormula = Boolean(formula);
      if (!formula) {
        formula = await ProcessFormula.findByPk(formula_id, { transaction });
      }
      if (!formula || (formula.is_active !== undefined && !formula.is_active)) {
        throw new Error('Fórmula no válida o inactiva.');
      }

      // No se prepara mezcla si la fórmula todavía no tiene PTI de salida.
      const { PtiProduct } = require('../../database/models');
      const linkedPti = isOfficialExtrusionFormula && await PtiProduct.findOne({
        where: {
          is_active: true,
          [sequelize.Sequelize.Op.or]: [
            { id: formula.output_pti_id || -1 },
            { formula_id: formula.id },
          ],
        },
        transaction,
      });
      if (!linkedPti) {
        const error = new Error('No se puede preparar la mezcla: registra y enlaza primero un PTI activo a esta fórmula.');
        error.statusCode = 400;
        throw error;
      }

      // 2. Validar restricciones de Extrusora si se especificó
      const machineId = extruder_id ? Number(extruder_id) : null;
      let extruder = null;
      let isSiloMode = false;

      if (machineId) {
        const { Extruder, ExtruderFormula } = require('../../database/models');
        extruder = await Extruder.findByPk(machineId, {
          transaction
        });

        if (!extruder && ![1, 2, 3, 4, 5, 6].includes(machineId)) {
          const error = new Error('Máquina no válida.');
          error.statusCode = 400;
          throw error;
        }

        // Fase 3: Hard-block Extrusora 4 (Cero PP-B)
        if (machineId === 4) {
          const hasProhibitedPpb = (formula.ingredients || []).some(ing => {
            const matName = (ing.material?.name || '').toUpperCase();
            return ing.is_restricted_on_machine_4 || matName.includes('POLIPROPILENO (B)');
          });
          if (hasProhibitedPpb) {
            const error = new Error("Restricción de Máquina: La Extrusora 4 tiene estrictamente prohibido procesar fórmulas que contengan 'POLIPROPILENO (B)'. Intento bloqueado.");
            error.statusCode = 400;
            throw error;
          }
        }

        // Matriz de compatibilidad relacional
        const matrixCount = await ExtruderFormula.count({ where: { extruder_id: machineId }, transaction });
        if (matrixCount > 0) {
          const isAllowedInMatrix = await ExtruderFormula.findOne({
            where: { extruder_id: machineId, formula_id: formula.id, is_allowed: true },
            transaction
          });
          if (!isAllowedInMatrix) {
            const error = new Error(`Matriz de Compatibilidad: La fórmula '${formula.name}' no está autorizada para la Extrusora ${machineId}. Intento bloqueado.`);
            error.statusCode = 400;
            throw error;
          }
        } else {
          // Fallback a allowed_extruders si aún no se pobló la matriz para esta máquina
          if (formula.restricted_extruders && formula.restricted_extruders.includes(machineId)) {
            const error = new Error(`Restricción de Máquina: La Extrusora ${machineId} tiene estrictamente prohibido procesar la fórmula '${formula.name}'. Intento bloqueado.`);
            error.statusCode = 400;
            throw error;
          }
          if (formula.allowed_extruders && formula.allowed_extruders.length > 0 && !formula.allowed_extruders.includes(machineId)) {
            const error = new Error(`Restricción de Máquina: La Extrusora ${machineId} no está autorizada para la fórmula '${formula.name}'. Máquinas permitidas: [${formula.allowed_extruders.join(', ')}]. Intento bloqueado.`);
            error.statusCode = 400;
            throw error;
          }
        }
      }

      // El silo abastece al mezclador. Su selección es independiente de la
      // extrusora que recibirá después los contenedores preparados.
      const { Silo } = require('../../database/models');
      const ppIngredients = (formula.ingredients || []).filter(ing => {
        const matName = (ing.material?.name || ing.material_name || '').toUpperCase();
        const matCode = (ing.material?.internal_code || ing.material_code || '').toUpperCase();
        return matName.includes('POLIPROPILENO') || matName.includes('PP ') || matCode.startsWith('MP-PP');
      });
      const requestedSiloInputs = Array.isArray(silo_inputs) ? silo_inputs : [];
      // Backward compatibility for formulas with a single silo-fed PP ingredient.
      const siloAssignments = requestedSiloInputs.length
        ? requestedSiloInputs
        : (silo_id && ppIngredients.length === 1 ? [{ material_id: ppIngredients[0].material_id, silo_id }] : []);
      const siloMaterialIds = new Set(siloAssignments.map(item => Number(item.material_id)));
      isSiloMode = siloAssignments.length > 0;
      if ((silo_id || siloAssignments.length) && ppIngredients.length === 0) {
        throw Object.assign(new Error('No se puede seleccionar un silo para una fórmula que no contiene polipropileno.'), { statusCode: 400 });
      }
      if (siloMaterialIds.size !== siloAssignments.length) {
        throw Object.assign(new Error('No se puede asignar más de un silo al mismo material de polipropileno.'), { statusCode: 400 });
      }
      for (const assignment of siloAssignments) {
        if (!Number.isInteger(Number(assignment.silo_id)) || Number(assignment.silo_id) <= 0) {
          throw Object.assign(new Error('Uno de los silos seleccionados no es válido.'), { statusCode: 400 });
        }
        if (!ppIngredients.some(ingredient => Number(ingredient.material_id) === Number(assignment.material_id))) {
          throw Object.assign(new Error(`El material ${assignment.material_id} no es un ingrediente de polipropileno de esta fórmula.`), { statusCode: 400 });
        }
      }

      // 3. Generar Nomenclatura de Contenedor(es) - Asignados automáticamente por el sistema
      const count = container_count == null || container_count === '' ? 1 : Number(container_count);
      if (!Number.isInteger(count) || count < 1 || count > 10) {
        throw Object.assign(new Error('La cantidad de contenedores debe ser un entero entre 1 y 10.'), { statusCode: 400 });
      }
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const defaultPrefix = 'CONT-MIX';
      const baseContainerCode = destination_qr_code && destination_qr_code.trim()
        ? destination_qr_code.trim().toUpperCase()
        : `${defaultPrefix}-${todayStr}-${randomSuffix}`;

      const containerCodes = count === 1
        ? [baseContainerCode]
        : Array.from({ length: count }, (_, i) => `${baseContainerCode}-C${i + 1}`);

      const primaryQrCode = containerCodes[0];

      let destQr = await QrCode.findOne({ where: { qr_code: primaryQrCode }, transaction });
      if (!destQr) {
        let latestBatch = await QrBatch.findOne({ order: [['id', 'DESC']], transaction });
        if (!latestBatch) {
          latestBatch = await QrBatch.create({
            batch_code: `BATCH-MIX-${Date.now()}`,
            quantity: 1,
            assigned_area_id: effectiveAreaId,
            status: 'AVAILABLE',
            created_by: userId || 1
          }, { transaction });
        }
        destQr = await QrCode.create({
          serial: Date.now() + Math.floor(Math.random() * 1000),
          qr_code: primaryQrCode,
          batch_id: latestBatch.id,
          purpose: 'MIXTURE_CONTAINER',
          assigned_area_id: effectiveAreaId,
          status: 'GENERATED',
          created_by: userId || 1
        }, { transaction });
      } else if (destQr.status !== 'GENERATED' && destQr.status !== 'AVAILABLE' && destQr.status !== 'UNASSIGNED') {
        throw new Error('El código QR de destino ya está en uso en otro proceso.');
      }

      // 4. Generar Folio y Preparación
      let totalQuantity = 0;
      let preparation;

      if (preparation_id) {
        preparation = await ProcessPreparation.findByPk(preparation_id, { transaction });
        if (!preparation) throw new Error('Ticket de preparación no encontrado');
        
        preparation.destination_qr_code_id = destQr.id;
        preparation.status = 'PREPARADA';
        preparation.prepared_by = userId;
        preparation.prepared_at = new Date();
        if (notes) preparation.notes = notes;
        preparation.is_silo_kit = false;
        await preparation.save({ transaction });
      } else {
        const folio = `MIX-EXT-${Date.now()}`;
        preparation = await ProcessPreparation.create({
          folio,
          formula_id,
          from_area_id: effectiveAreaId,
          to_area_id: effectiveAreaId,
          destination_qr_code_id: destQr.id,
          total_quantity: 0,
          unit: 'KG',
          status: 'PREPARADA',
          is_silo_kit: false,
          notes: isSiloMode ? `${notes || ''} [PP suministrado al mezclador desde silo]`.trim() : notes,
          prepared_by: userId,
          prepared_at: new Date()
        }, { transaction });
      }

      // 5. El mezclador puede recibir cada ingrediente PP desde su silo correspondiente.
      if (isSiloMode) {
        const batchSize = Number(formula.batch_size_kg) || 500.00;
        if (siloMaterialIds.size !== ppIngredients.length) {
          const missing = ppIngredients.filter(item => !siloMaterialIds.has(Number(item.material_id)));
          throw Object.assign(new Error(`Asigna un silo a cada material PP de la fórmula: ${missing.map(item => item.material?.name || item.material_id).join(', ')}.`), { statusCode: 400 });
        }
        for (const assignment of siloAssignments) {
          const ppIngredient = ppIngredients.find(item => Number(item.material_id) === Number(assignment.material_id));
          let requiredKg = Number(ppIngredient.quantity);
          if (!Number.isFinite(requiredKg) || requiredKg <= 0) requiredKg = (batchSize * (Number(ppIngredient.percentage) || 95)) / 100;
          const deductedKg = Number((requiredKg * count).toFixed(3));
          const targetSilo = await Silo.findByPk(Number(assignment.silo_id), { transaction, lock: transaction.LOCK.UPDATE });
          if (!targetSilo || !targetSilo.is_active) {
            throw Object.assign(new Error(`El silo ${assignment.silo_id} no existe o está inactivo.`), { statusCode: 400 });
          }
          if (ppIngredient.material_id && Number(targetSilo.material_id) !== Number(ppIngredient.material_id)) {
            throw Object.assign(new Error(`El Silo ${targetSilo.code} contiene un material distinto al requerido (${ppIngredient.material?.name || ppIngredient.material_id}).`), { statusCode: 400 });
          }
          const siloLotType = String(targetSilo.current_lot_type || '').toUpperCase();
          const siloLotNumber = String(targetSilo.current_lot_number || '').toUpperCase();
          if (machineId === 4 && (siloLotType === 'B' || siloLotNumber.includes('PP-B') || siloLotNumber.includes('LOTE-B'))) {
            throw Object.assign(new Error(`La Extrusora 4 no puede recibir PP tipo B desde el silo ${targetSilo.code}.`), { statusCode: 400 });
          }
          const before = Number(targetSilo.current_stock_kg);
          if (before < deductedKg) {
            throw Object.assign(new Error(`Stock insuficiente en Silo ${targetSilo.code}: requiere ${deductedKg} kg; disponible ${before} kg.`), { statusCode: 400 });
          }
          const after = Number((before - deductedKg).toFixed(3));
          targetSilo.current_stock_kg = after;
          await targetSilo.save({ transaction });
          await ProcessPreparationInput.create({
            preparation_id: preparation.id,
            source_traceable_item_id: null,
            source_qr_code_id: null,
            material_id: targetSilo.material_id || ppIngredient.material_id,
            quantity: deductedKg,
            unit: 'KG',
            balance_before: before,
            balance_after: after,
            source_silo_id: targetSilo.id,
            source_lot_number: targetSilo.current_lot_number || null,
            unit_cost_snapshot: targetSilo.unit_cost == null ? null : Number(targetSilo.unit_cost),
            extended_cost_snapshot: targetSilo.unit_cost == null ? null : Number((deductedKg * Number(targetSilo.unit_cost)).toFixed(4)),
            notes: `Alimentación al mezclador de ${ppIngredient.material?.name || 'PP'} desde Silo ${targetSilo.code}; Lote: ${targetSilo.current_lot_number || 'N/A'}`
          }, { transaction });
          totalQuantity += deductedKg;
        }
      }

      // 6. Procesar Entradas Restantes de Aditivos con QR Hijo (-SN)
      const folio = preparation.folio;
      let primaryMaterialId = formula.target_intermediate_material_id || (formula.ingredients && formula.ingredients[0]?.material_id);
      for (const input of (inputs || [])) {
        if (isSiloMode && siloMaterialIds.has(Number(input.material_id))) {
          // Si por alguna razón se envió el PP en inputs, ya fue procesado por el Silo
          continue;
        }
        const sourceQr = await QrCode.findOne({ where: { qr_code: input.qr_code }, transaction });
        if (!sourceQr) throw new Error(`QR ${input.qr_code} no encontrado.`);

        const wipItem = await WipInventory.findOne({
          where: { qr_code_id: sourceQr.id, area_id: effectiveAreaId },
          include: [{ model: Lote, as: 'lote', attributes: ['id', 'folio', 'unit_cost'] }],
          transaction,
          // Lock only the WIP row. PostgreSQL cannot apply FOR UPDATE to the
          // nullable side of the optional Lote LEFT JOIN above.
          lock: { level: transaction.LOCK.UPDATE, of: WipInventory }
        });

        if (!wipItem) {
          throw new Error(`El material con QR ${input.qr_code} no se encuentra en el WIP de Extrusión.`);
        }

        if (!primaryMaterialId && wipItem.material_id) {
          primaryMaterialId = wipItem.material_id;
        }

        if (Number(wipItem.amount) < Number(input.quantity)) {
          throw new Error(`Cantidad insuficiente en el QR ${input.qr_code}. Disponible: ${wipItem.amount}.`);
        }

        // Descontar
        const balanceBefore = Number(wipItem.amount);
        const consumedQuantity = Number(input.quantity);
        const newAmount = Number((balanceBefore - consumedQuantity).toFixed(3));
        wipItem.amount = newAmount;
        await wipItem.save({ transaction });

        totalQuantity += Number(input.quantity);

        // Asegurar existencia de TraceableItem para el QR origen
        let sourceTraceable = await TraceableItem.findOne({
          where: { qr_code_id: sourceQr.id },
          transaction
        });

        if (!sourceTraceable) {
          sourceTraceable = await TraceableItem.create({
            qr_code_id: sourceQr.id,
            item_type: 'RAW_MATERIAL_LOT',
            material_id: wipItem.material_id,
            current_area_id: effectiveAreaId,
            quantity_initial: balanceBefore,
            quantity_current: balanceBefore,
            unit: 'KG',
            status: 'DISPONIBLE'
          }, { transaction });
        }
        let traceableBalance = Number(sourceTraceable.quantity_current);
        if (Math.abs(traceableBalance - balanceBefore) > 0.001) {
          const difference = Number(Math.abs(traceableBalance - balanceBefore).toFixed(3));
          const previousTraceableBalance = traceableBalance;
          traceableBalance = balanceBefore;
          sourceTraceable.quantity_current = balanceBefore;
          sourceTraceable.status = balanceBefore <= 0.001 ? 'CONSUMIDO' : 'DISPONIBLE';
          sourceTraceable.updated_by = userId || null;
          await sourceTraceable.save({ transaction });
          await TraceabilityMovement.create({
            traceable_item_id: sourceTraceable.id,
            qr_code_id: sourceQr.id,
            movement_type: previousTraceableBalance > balanceBefore ? 'AJUSTE_SALIDA' : 'AJUSTE_ENTRADA',
            quantity: difference,
            unit: 'KG',
            balance_after: balanceBefore,
            reference_folio: folio,
            performed_by: userId || null,
            notes: `Conciliación trazable contra saldo WIP antes de preparar ${folio}.`,
            metadata: {
              reason: 'CONCILIACION_WIP_ANTES_DE_MEZCLA',
              wip_balance_kg: balanceBefore,
              previous_traceable_balance_kg: previousTraceableBalance,
              reconciled_difference_kg: difference,
            },
          }, { transaction });
        }
        if (traceableBalance + 0.001 < consumedQuantity) {
          throw Object.assign(new Error(`El QR ${input.qr_code} tiene ${traceableBalance.toFixed(3)} kg trazables, menos que los ${consumedQuantity.toFixed(3)} kg disponibles en WIP.`), { statusCode: 409 });
        }
        const traceableAfter = Number((traceableBalance - consumedQuantity).toFixed(3));
        sourceTraceable.quantity_current = traceableAfter;
        sourceTraceable.status = traceableAfter <= 0.001 ? 'CONSUMIDO' : 'DISPONIBLE';
        sourceTraceable.updated_by = userId || null;
        await sourceTraceable.save({ transaction });

        // Crear registro en ProcessPreparationInput
        await ProcessPreparationInput.create({
          preparation_id: preparation.id,
          source_traceable_item_id: sourceTraceable.id,
          source_qr_code_id: sourceQr.id,
          material_id: wipItem.material_id,
          quantity: consumedQuantity,
          unit: 'KG',
          balance_before: balanceBefore,
          balance_after: newAmount,
          source_lote_id: wipItem.lote_id,
          source_lot_number: wipItem.lote?.folio || null,
          unit_cost_snapshot: wipItem.lote?.unit_cost == null ? null : Number(wipItem.lote.unit_cost),
          extended_cost_snapshot: wipItem.lote?.unit_cost == null
            ? null
            : Number((consumedQuantity * Number(wipItem.lote.unit_cost)).toFixed(4)),
        }, { transaction });

        // Trazabilidad Consumo
        const isDepleted = newAmount === 0;
        if (isDepleted) {
          await sourceQr.update({ status: 'CONSUMED', is_active: false }, { transaction });
        }

        await TraceabilityEvent.create({
          qr_code_id: sourceQr.id,
          event_type: 'CONSUMO_MEZCLA',
          entity_type: 'ProcessPreparation',
          entity_id: preparation.id.toString(),
          from_status: isDepleted ? 'IN_WIP' : 'IN_WIP',
          to_status: isDepleted ? 'CONSUMED' : 'IN_WIP',
          performed_by: userId,
          notes: `Consumido para la mezcla ${folio}`,
          metadata: { preparation_id: preparation.id, consumed_amount: input.quantity, remaining: newAmount }
        }, { transaction });

        await TraceabilityMovement.create({
          traceable_item_id: sourceTraceable.id,
          qr_code_id: sourceQr.id,
          movement_type: 'CONSUMO_PROCESO',
          quantity: consumedQuantity,
          unit: 'KG',
          balance_after: traceableAfter,
          reference_folio: folio,
          performed_by: userId || null,
          notes: `Consumo trazable para mezcla ${folio}. WIP restante: ${newAmount} kg.`,
          metadata: { preparation_id: preparation.id, wip_balance_after: newAmount },
        }, { transaction });
      }

      const expectedBatchKg = (Number(formula.batch_size_kg) || 500) * count;
      if (isOfficialExtrusionFormula && Math.abs(totalQuantity - expectedBatchKg) > 0.05) {
        throw Object.assign(
          new Error(`La dosificación debe completar ${expectedBatchKg.toFixed(2)} kg (${count} contenedor(es) de ${(Number(formula.batch_size_kg) || 500).toFixed(2)} kg); se capturaron ${totalQuantity.toFixed(2)} kg. Ajusta el PP del silo y los aditivos antes de registrar.`),
          { statusCode: 409 }
        );
      }

      // Costear la mezcla con el lote real de cada material consumido.
      const preparationInputs = await ProcessPreparationInput.findAll({
        where: { preparation_id: preparation.id },
        transaction
      });
      const sourceSilos = await Silo.findAll({
        where: { id: preparationInputs.filter((item) => item.source_silo_id).map((item) => item.source_silo_id) },
        transaction,
      });
      const sourceSiloById = new Map(sourceSilos.map((silo) => [Number(silo.id), silo]));
      const hasCompleteInputCosts = preparationInputs.length > 0 && preparationInputs.every(
        (item) => item.extended_cost_snapshot !== null && item.extended_cost_snapshot !== undefined
      );
      const materialCostSnapshot = hasCompleteInputCosts
        ? Number(preparationInputs.reduce((sum, item) => sum + Number(item.extended_cost_snapshot), 0).toFixed(4))
        : null;
      const costIndexSnapshot = Number(formula.cost_index) > 0 ? Number(formula.cost_index) : 1.15;
      const transformedValueSnapshot = materialCostSnapshot === null
        ? null
        : Number((materialCostSnapshot * costIndexSnapshot).toFixed(4));
      const transformedCostPerKg = transformedValueSnapshot === null || totalQuantity <= 0
        ? null
        : Number((transformedValueSnapshot / totalQuantity).toFixed(6));
      const formulaSnapshot = {
        id: formula.id,
        code: formula.code || null,
        name: formula.name,
        batch_size_kg: Number(formula.batch_size_kg) || 500,
        cost_index: costIndexSnapshot,
        expected_yield_pieces: Number(formula.expected_yield_pieces) || null,
        ingredients: (formula.ingredients || []).map((ingredient) => ({
          material_id: ingredient.material_id,
          material_name: ingredient.material?.name || null,
          quantity: Number(ingredient.quantity) || 0,
          percentage: Number(ingredient.percentage) || 0,
          unit: ingredient.unit || 'KG',
        })),
      };
      preparation.cost_index_snapshot = costIndexSnapshot;
      preparation.material_cost_snapshot = materialCostSnapshot;
      preparation.transformed_value_snapshot = transformedValueSnapshot;
      preparation.transformed_cost_per_kg = transformedCostPerKg;
      preparation.cost_valuation_status = transformedCostPerKg === null ? 'PENDIENTE' : 'VALUADO';
      preparation.formula_snapshot = formulaSnapshot;
      preparation.remaining_quantity_kg = totalQuantity;

      // 6. Dividir Cantidad Total entre los N Contenedores y Crear TraceableItems + QRs
      const weightPerContainer = Number((totalQuantity / count).toFixed(2));
      const createdContainers = [];
      let latestBatch = await QrBatch.findOne({ order: [['id', 'DESC']], transaction });

      for (let i = 0; i < containerCodes.length; i++) {
        const cCode = containerCodes[i];
        // En el último contenedor se ajusta la diferencia de redondeo para que la suma exacta sea totalQuantity
        const cWeight = i === containerCodes.length - 1
          ? Number((totalQuantity - (weightPerContainer * (containerCodes.length - 1))).toFixed(2))
          : weightPerContainer;

        let cQr = await QrCode.findOne({ where: { qr_code: cCode }, transaction });
        if (!cQr) {
          if (!latestBatch) {
            latestBatch = await QrBatch.create({
              batch_code: `BATCH-MIX-${Date.now()}`,
              quantity: 1,
              assigned_area_id: effectiveAreaId,
              status: 'AVAILABLE',
              created_by: userId || 1
            }, { transaction });
          }
          cQr = await QrCode.create({
            serial: Date.now() + Math.floor(Math.random() * 1000) + i,
            qr_code: cCode,
            batch_id: latestBatch.id,
            purpose: 'MIXTURE_CONTAINER',
            assigned_area_id: effectiveAreaId,
            status: 'EN_USO',
            created_by: userId || 1
          }, { transaction });
        } else {
          await cQr.update({
            status: 'EN_USO',
            assigned_area_id: preparation.to_area_id
          }, { transaction });
        }

        const cTraceable = await TraceableItem.create({
          qr_code_id: cQr.id,
          item_type: 'PREPARED_MIX',
          origin_area_id: preparation.to_area_id,
          current_area_id: preparation.to_area_id,
          quantity_initial: cWeight,
          quantity_current: cWeight,
          unit: 'KG',
          status: 'DISPONIBLE',
          reference_folio: folio,
          created_by: userId,
          metadata: {
            container_number: i + 1,
            total_containers: count,
            extruder_id: machineId || null,
            preparation_id: preparation.id,
            transformed_cost_per_kg: transformedCostPerKg,
            cost_valuation_status: preparation.cost_valuation_status,
          }
        }, { transaction });

        await TraceabilityEvent.create({
          qr_code_id: cQr.id,
          event_type: 'GENERACION_MEZCLA',
          entity_type: 'ProcessPreparation',
          entity_id: preparation.id.toString(),
          from_status: 'GENERATED',
          to_status: 'EN_USO',
          performed_by: userId,
          notes: `Contenedor ${i + 1}/${count} (${cWeight} kg) generado para mezcla ${folio}. Fórmula: ${formula.name}${sourceSilos.length ? `; PP abastecido desde ${sourceSilos.map((silo) => `${silo.code} (${silo.current_lot_number || 'sin referencia'})`).join(', ')}` : ''}`,
          metadata: {
            preparation_id: preparation.id,
            total_quantity: totalQuantity,
            container_weight: cWeight,
            container_number: i + 1,
            silo_inputs: preparationInputs
              .filter((item) => item.source_silo_id)
              .map((item) => ({
                source_silo_id: item.source_silo_id,
                source_silo_code: sourceSiloById.get(Number(item.source_silo_id))?.code || null,
                material_id: item.material_id,
                quantity_kg: Number((Number(item.quantity) * cWeight / totalQuantity).toFixed(3)),
                lot_or_invoice_references: item.source_lot_number || null,
                unit_cost_snapshot: item.unit_cost_snapshot == null ? null : Number(item.unit_cost_snapshot),
                extended_cost_snapshot: item.extended_cost_snapshot == null
                  ? null
                  : Number((Number(item.extended_cost_snapshot) * cWeight / totalQuantity).toFixed(4)),
                no_qr_reason: 'Recepción directa al silo, conforme al proceso sin QR de costales.',
              })),
          }
        }, { transaction });

        createdContainers.push({
          container_number: i + 1,
          total_containers: count,
          qr_code: cCode,
          qr_id: cQr.id,
          traceable_item_id: cTraceable.id,
          capacity_kg: cWeight,
          formula_name: formula.name,
          formula_code: formula.code || '',
          folio,
          extruder_id: machineId || null,
          created_at: new Date()
        });
      }

      // Conectar cada QR de materia prima con cada contenedor generado para
      // que la consulta de trazabilidad recorra la genealogía completa.
      for (const inputRecord of preparationInputs) {
        if (!inputRecord.source_traceable_item_id || !inputRecord.source_qr_code_id) continue;
        let allocatedSoFarKg = 0;
        for (const container of createdContainers) {
          const allocatedInputKg = container.container_number === count
            ? Number((Number(inputRecord.quantity) - allocatedSoFarKg).toFixed(3))
            : Number((Number(inputRecord.quantity) * Number(container.capacity_kg) / totalQuantity).toFixed(3));
          allocatedSoFarKg = Number((allocatedSoFarKg + allocatedInputKg).toFixed(3));
          await TraceabilityLink.create({
            parent_traceable_item_id: inputRecord.source_traceable_item_id,
            child_traceable_item_id: container.traceable_item_id,
            parent_qr_code_id: inputRecord.source_qr_code_id,
            child_qr_code_id: container.qr_id,
            link_type: 'PREPARACION_FORMULA',
            quantity_used: allocatedInputKg,
            quantity_generated: container.capacity_kg,
            unit: 'KG',
            process_area_id: effectiveAreaId,
            reference_folio: folio,
            notes: `Materia prima asignada proporcionalmente al contenedor ${container.container_number}/${count}.`,
            metadata: { preparation_id: preparation.id, source_material_id: inputRecord.material_id, source_lote_id: inputRecord.source_lote_id || null },
            created_by: userId || null,
          }, { transaction });
        }
      }

      preparation.total_quantity = totalQuantity;
      preparation.destination_traceable_item_id = createdContainers[0]?.traceable_item_id || null;
      await preparation.save({ transaction });

      // 7. Crear el Lote correspondiente a la Mezcla
      if (!primaryMaterialId) {
        const anyMat = await Material.findOne({ where: { is_active: true }, transaction });
        primaryMaterialId = anyMat ? anyMat.id : null;
      }

      const lote = await Lote.create({
        material_id: primaryMaterialId,
        folio,
        user_id: userId,
        qr_id: destQr.id,
        location_id: null,
        initial_amount: totalQuantity,
        available_amount: totalQuantity,
        unit_cost: transformedCostPerKg,
        total_cost: transformedValueSnapshot,
        notes: `Lote de Mezcla generado en Extrusión (${count} contenedor(es))`,
        is_active: true
      }, { transaction });

      // 8. Encolar en Extrusora si se especificó (al final de la cola, status 'EN_ESPERA', priority 1)
      if (machineId) {
        const { ExtruderQueue } = require('../../database/models');
        for (const c of createdContainers) {
          const queueItem = await ExtruderQueue.create({
            extruder_id: machineId,
            consumption_order_qr_id: c.qr_code,
            formula_id: formula.id,
            process_preparation_id: preparation.id,
            priority: 1, // Al final de la cola (en orden)
            status: 'EN_ESPERA',
            is_silo_kit: false,
            notes: notes
              ? `${notes} (Contenedor ${c.container_number}/${count} - ${c.capacity_kg} kg)`
              : `Contenedor ${c.container_number}/${count} - Mezcla ${folio} (${c.capacity_kg} kg)`
          }, { transaction });
          c.queue_id = queueItem.id;
        }
      }

      const prepJson = preparation.toJSON ? preparation.toJSON() : { ...preparation };
      return {
        ...prepJson,
        containers: createdContainers,
        extruder_id: machineId || null,
        total_quantity: totalQuantity
      };
    });
  }

  async getFormulas() {
    return this.getExtrusionFormulas();
  }

  async getFormulaDetails(id) {
    const { Formula, FormulaIngredient, Material, WipInventory, QrCode, ProcessFormula, ProcessFormulaItem } = require('../../database/models');
    const { Op } = require('sequelize');
    
    // 1. Buscar en el catálogo oficial de Fórmulas de Extrusión (500kg)
    let formula = await Formula.findByPk(id, {
      include: [
        {
          model: FormulaIngredient,
          as: 'ingredients',
          include: [{ model: Material, as: 'material' }]
        }
      ]
    });

    // Búsqueda por código si se pasa un string o código
    if (!formula && (typeof id === 'string' && isNaN(Number(id)))) {
      formula = await Formula.findOne({
        where: { code: id },
        include: [
          {
            model: FormulaIngredient,
            as: 'ingredients',
            include: [{ model: Material, as: 'material' }]
          }
        ]
      });
    }

    if (formula) {
      const detailedItems = [];
      const ingredients = formula.ingredients || [];

      for (const ing of ingredients) {
        const mat = ing.material;
        const wipSum = (await WipInventory.sum('amount', {
          where: {
            material_id: ing.material_id,
            area_id: 2
          }
        })) || 0;

        const reqQty = Number(ing.quantity || 0);
        const availWip = Number(Number(wipSum).toFixed(2));

        // Obtener todos los sacos hijos (-SN) activos con existencias en Área 2 ordenados por FIFO
        const fifoWipList = await WipInventory.findAll({
          where: {
            material_id: ing.material_id,
            area_id: 2,
            amount: { [Op.gt]: 0 }
          },
          include: [{
            model: QrCode,
            as: 'qr_code',
            required: true,
            where: {
              is_active: true,
              status: { [Op.ne]: 'CONSUMED' },
              qr_code: { [Op.like]: '%-SN%' }
            },
            attributes: ['id', 'qr_code']
          }],
          order: [['created_at', 'ASC']]
        });

        const fifoQrs = [];
        let accumulatedKg = 0;
        let sacksNeededCount = 0;
        let reachedRequirement = false;

        for (const itemWip of fifoWipList) {
          const sackQty = Number(itemWip.amount || 0);
          accumulatedKg = Number((accumulatedKg + sackQty).toFixed(2));
          if (!reachedRequirement) {
            sacksNeededCount++;
            if (accumulatedKg >= reqQty) {
              reachedRequirement = true;
            }
          }
          fifoQrs.push({
            qr_code: itemWip.qr_code?.qr_code,
            amount: sackQty,
            accumulated_kg: accumulatedKg,
            is_priority: fifoQrs.length === 0,
            covers_remaining: accumulatedKg >= reqQty
          });
        }

        const nextFifoWip = fifoWipList[0] || null;

        detailedItems.push({
          id: ing.id,
          formula_id: formula.id,
          material_id: ing.material_id,
          material_name: mat ? mat.name : 'Desconocido',
          material_code: mat ? (mat.internal_code || mat.material_code) : '',
          required_quantity: reqQty,
          percentage: Number(ing.percentage || 0),
          is_restricted: Boolean(ing.is_restricted_on_machine_4),
          available_wip_kg: availWip,
          is_sufficient: availWip >= reqQty,
          suggested_fifo_qr: nextFifoWip?.qr_code?.qr_code || null,
          suggested_fifo_amount: nextFifoWip ? Number(nextFifoWip.amount) : null,
          fifo_qrs: fifoQrs,
          fifo_sacks_needed: sacksNeededCount || (fifoQrs.length > 0 ? 1 : 0),
          fifo_total_available_kg: accumulatedKg
        });
      }

      const allSufficient = detailedItems.length > 0 && detailedItems.every(i => i.is_sufficient);

      return {
        ...formula.toJSON(),
        items: detailedItems,
        all_materials_available: allSufficient
      };
    }

    // 2. Fallback a ProcessFormula para retrocompatibilidad
    const legacyFormula = await ProcessFormula.findByPk(id);
    if (!legacyFormula) throw new Error('Fórmula no encontrada.');

    const items = await ProcessFormulaItem.findAll({
      where: { formula_id: id },
      order: [['sort_order', 'ASC']]
    });

    const detailedItems = [];
    for (const item of items) {
      const mat = await Material.findByPk(item.material_id);
      const wipSum = (await WipInventory.sum('amount', {
        where: {
          material_id: item.material_id,
          area_id: 2
        }
      })) || 0;

      const reqQty = Number(item.quantity || 0);
      const availWip = Number(Number(wipSum).toFixed(2));

      const fifoWipList = await WipInventory.findAll({
        where: {
          material_id: item.material_id,
          area_id: 2,
          amount: { [Op.gt]: 0 }
        },
        include: [{
          model: QrCode,
          as: 'qr_code',
          required: true,
          where: {
            is_active: true,
            status: { [Op.ne]: 'CONSUMED' },
            qr_code: { [Op.like]: '%-SN%' }
          },
          attributes: ['id', 'qr_code']
        }],
        order: [['created_at', 'ASC']]
      });

      const fifoQrs = [];
      let accumulatedKg = 0;
      let sacksNeededCount = 0;
      let reachedRequirement = false;

      for (const itemWip of fifoWipList) {
        const sackQty = Number(itemWip.amount || 0);
        accumulatedKg = Number((accumulatedKg + sackQty).toFixed(2));
        if (!reachedRequirement) {
          sacksNeededCount++;
          if (accumulatedKg >= reqQty) {
            reachedRequirement = true;
          }
        }
        fifoQrs.push({
          qr_code: itemWip.qr_code?.qr_code,
          amount: sackQty,
          accumulated_kg: accumulatedKg,
          is_priority: fifoQrs.length === 0,
          covers_remaining: accumulatedKg >= reqQty
        });
      }

      const nextFifoWip = fifoWipList[0] || null;

      detailedItems.push({
        ...item.toJSON(),
        material_name: mat ? mat.name : 'Desconocido',
        material_code: mat ? mat.internal_code : '',
        required_quantity: reqQty,
        available_wip_kg: availWip,
        is_sufficient: availWip >= reqQty,
        suggested_fifo_qr: nextFifoWip?.qr_code?.qr_code || null,
        suggested_fifo_amount: nextFifoWip ? Number(nextFifoWip.amount) : null,
        fifo_qrs: fifoQrs,
        fifo_sacks_needed: sacksNeededCount || (fifoQrs.length > 0 ? 1 : 0),
        fifo_total_available_kg: accumulatedKg
      });
    }

    const allSufficient = detailedItems.length > 0 && detailedItems.every(i => i.is_sufficient);

    return {
      ...legacyFormula.toJSON(),
      items: detailedItems,
      all_materials_available: allSufficient
    };
  }

  async getWipChildQr(qrCode) {
    const cleanQr = (qrCode || '').trim().toUpperCase();
    if (!cleanQr) throw new Error('Código QR requerido.');

    if (!cleanQr.includes('-SN')) {
      const error = new Error('Código rechazado: Solo se admiten QRs Hijos (-SN) surtidos hacia el WIP de Extrusión.');
      error.statusCode = 400;
      throw error;
    }

    const { QrCode, WipInventory, Material } = require('../../database/models');
    const qr = await QrCode.findOne({ where: { qr_code: cleanQr } });
    if (!qr) {
      const error = new Error(`El código QR '${cleanQr}' no existe en el sistema.`);
      error.statusCode = 404;
      throw error;
    }

    if (qr.status === 'CONSUMED' || !qr.is_active) {
      const error = new Error(`El QR Hijo '${cleanQr}' ya fue consumido en su totalidad en una preparación anterior (Stock disponible: 0 kg).`);
      error.statusCode = 400;
      throw error;
    }

    const wip = await WipInventory.findOne({
      where: { qr_code_id: qr.id, area_id: 2 },
      include: [{ model: Material, as: 'material' }]
    });

    if (!wip || Number(wip.amount) <= 0) {
      const wipOtherArea = await WipInventory.findOne({ where: { qr_code_id: qr.id } });
      if (wipOtherArea && wipOtherArea.area_id !== 2) {
        const error = new Error(`El QR Hijo '${cleanQr}' no ha sido surtido al WIP de Extrusión (se encuentra registrado en otra área).`);
        error.statusCode = 400;
        throw error;
      }
      const error = new Error(`El QR Hijo '${cleanQr}' no tiene existencias disponibles en el WIP de Extrusión (Stock: 0 kg).`);
      error.statusCode = 400;
      throw error;
    }

    return {
      qr_code: qr.qr_code,
      qr_id: qr.id,
      material_id: wip.material_id,
      material_name: wip.material ? wip.material.name : 'Material',
      material_code: wip.material ? wip.material.internal_code : '',
      available_amount: Number(wip.amount),
      unit: 'KG'
    };
  }

  async createMixRequest(payload, userId) {
    const { formula_id, to_area_id, quantity, notes } = payload;
    
    // validate formula (support both Formula and ProcessFormula)
    const { Formula, ProcessFormula } = require('../../database/models');
    let formula = await Formula.findByPk(formula_id);
    if (!formula) {
      formula = await ProcessFormula.findByPk(formula_id);
    }
    if (!formula) throw new Error('Fórmula no encontrada');

    // Create a ProcessPreparation record as a "Ticket" (Status: SOLICITADA)
    const folio = `MIX-REQ-${Date.now().toString().slice(-6)}`;
    
    const preparation = await ProcessPreparation.create({
      folio,
      formula_id,
      from_area_id: 1, // Central Mixing Area ID - Adjust according to seed
      to_area_id,      // The extruder requesting it
      destination_qr_code_id: null, // No QR yet
      total_quantity: quantity || 500,
      unit: (formula.base_unit_id === 1 || formula.unit === 'KG') ? 'Kg' : 'Kg',
      status: 'SOLICITADA',
      notes: notes || `Mezcla solicitada por Extrusora`,
      prepared_by: userId,
      prepared_at: new Date()
    });

    return preparation;
  }

  async getMixRequests(status = 'SOLICITADA') {
    // We should ideally join with Area and ProcessFormula to return names
    const preparations = await ProcessPreparation.findAll({
      where: { status },
      order: [['created_at', 'ASC']]
    });

    // Populate formula name manually if relationships aren't loaded in index.js
    const { Area, Formula, ProcessFormula } = require('../../database/models');
    
    const detailed = [];
    for (const prep of preparations) {
      let form = await Formula.findByPk(prep.formula_id);
      if (!form) {
        form = await ProcessFormula.findByPk(prep.formula_id);
      }
      const area = await Area.findByPk(prep.to_area_id);
      
      detailed.push({
        ...prep.toJSON(),
        formula_name: form ? form.name : 'Unknown Formula',
        extruder_name: area ? area.name : 'Unknown Extruder'
      });
    }

    return detailed;
  }

  /**
   * Obtiene el historial de mezclas preparadas recientemente con sus contenedores asociados
   */
  async getPreparedMixHistory(params = 100) {
    const { ProcessPreparation, Formula, ProcessFormula, TraceableItem, QrCode, Area } = require('../../database/models');
    const { Op } = require('sequelize');

    let limit = 100;
    let formulaId = null;
    let startDate = null;
    let endDate = null;
    let sortOrder = 'ASC'; // Predeterminada de las más antiguas a las más recientes

    if (typeof params === 'object' && params !== null) {
      limit = Number(params.limit) || 100;
      formulaId = params.formula_id || null;
      startDate = params.startDate || null;
      endDate = params.endDate || null;
      if (params.sort && ['ASC', 'DESC'].includes(params.sort.toUpperCase())) {
        sortOrder = params.sort.toUpperCase();
      }
    } else if (typeof params === 'number') {
      limit = params;
    }

    const where = { status: 'PREPARADA' };

    if (formulaId && formulaId !== 'ALL') {
      where.formula_id = formulaId;
    }

    if (startDate || endDate) {
      where.prepared_at = {};
      if (startDate) {
        where.prepared_at[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        if (endDate.length === 10) {
          end.setHours(23, 59, 59, 999);
        }
        where.prepared_at[Op.lte] = end;
      }
    }

    const preparations = await ProcessPreparation.findAll({
      where,
      order: [['prepared_at', sortOrder], ['id', sortOrder]],
      limit: Math.min(500, Math.max(1, limit))
    });

    const result = [];
    for (const prep of preparations) {
      let formula = await Formula.findByPk(prep.formula_id);
      if (!formula) {
        formula = await ProcessFormula.findByPk(prep.formula_id);
      }

      const area = prep.to_area_id ? await Area.findByPk(prep.to_area_id) : null;

      // Buscar los TraceableItems asociados a este folio de preparación
      const traceableItems = await TraceableItem.findAll({
        where: {
          item_type: 'PREPARED_MIX',
          reference_folio: prep.folio
        },
        include: [{ model: QrCode, as: 'qr_code' }],
        order: [['id', 'ASC']]
      });

      let containers = [];
      if (traceableItems.length > 0) {
        containers = traceableItems.map((item, idx) => ({
          container_number: item.metadata?.container_number || (idx + 1),
          total_containers: item.metadata?.total_containers || traceableItems.length,
          qr_code: item.qr_code?.qr_code || `CONT-${prep.folio}-${idx + 1}`,
          capacity_kg: Number(item.quantity_initial || (prep.total_quantity / traceableItems.length)),
          formula_name: formula ? formula.name : 'Fórmula Extrusión',
          formula_code: formula ? (formula.code || '') : '',
          folio: prep.folio,
          extruder_id: item.metadata?.extruder_id || (prep.to_area_id === 2 ? null : prep.to_area_id)
        }));
      } else {
        let destQr = null;
        if (prep.destination_qr_code_id) {
          destQr = await QrCode.findByPk(prep.destination_qr_code_id);
        }
        containers = [{
          container_number: 1,
          total_containers: 1,
          qr_code: destQr ? destQr.qr_code : `CONT-${prep.folio}`,
          capacity_kg: Number(prep.total_quantity || 500),
          formula_name: formula ? formula.name : 'Fórmula Extrusión',
          formula_code: formula ? (formula.code || '') : '',
          folio: prep.folio,
          extruder_id: prep.to_area_id === 2 ? null : prep.to_area_id
        }];
      }

      const assignedExtruderId = containers[0]?.extruder_id || (prep.to_area_id !== 2 ? prep.to_area_id : null);

      result.push({
        id: prep.id,
        folio: prep.folio,
        formula_id: prep.formula_id,
        formula_name: formula ? formula.name : 'Fórmula Extrusión',
        formula_code: formula ? (formula.code || '') : '',
        total_quantity: Number(prep.total_quantity || 500),
        status: prep.status,
        extruder_id: assignedExtruderId,
        extruder_name: assignedExtruderId ? `Extrusora ${assignedExtruderId}` : (area ? area.name : 'Piso Extrusión'),
        prepared_at: prep.prepared_at || prep.createdAt,
        notes: prep.notes,
        container_count: containers.length,
        containers
      });
    }

    return result;
  }

  /**
   * Recupera la información completa de contenedores de una mezcla a partir de un código QR o Folio
   */
  async getMixContainersByQrOrFolio(identifier) {
    const { ProcessPreparation, Formula, ProcessFormula, TraceableItem, QrCode, ExtruderQueue } = require('../../database/models');
    const clean = (identifier || '').trim().toUpperCase();

    if (!clean) {
      throw new Error('Debe proporcionar un código QR o Folio para recuperar los datos.');
    }

    // 1. Buscar si coincide con el QR directo de un TraceableItem
    let qr = await QrCode.findOne({ where: { qr_code: clean } });
    let traceable = null;
    if (qr) {
      traceable = await TraceableItem.findOne({
        where: { qr_code_id: qr.id, item_type: 'PREPARED_MIX' }
      });
    }

    let folio = traceable?.reference_folio || clean;

    // 2. Buscar ProcessPreparation por Folio
    let prep = await ProcessPreparation.findOne({ where: { folio } });
    if (!prep && traceable?.metadata?.preparation_id) {
      prep = await ProcessPreparation.findByPk(traceable.metadata.preparation_id);
    }

    // 3. Si no existe prep, buscar si existe en ExtruderQueue
    if (!prep && !traceable) {
      const queueItem = await ExtruderQueue.findOne({
        where: { consumption_order_qr_id: clean },
        include: [{ model: Formula, as: 'formula' }]
      });

      if (queueItem) {
        return {
          folio: `MIX-${clean}`,
          formula_name: queueItem.formula?.name || 'Fórmula Extrusión',
          formula_code: queueItem.formula?.code || '',
          total_quantity: 500,
          extruder_id: queueItem.extruder_id,
          containers: [{
            container_number: 1,
            total_containers: 1,
            qr_code: queueItem.consumption_order_qr_id,
            capacity_kg: 500,
            formula_name: queueItem.formula?.name || '',
            formula_code: queueItem.formula?.code || '',
            folio: `MIX-${clean}`,
            extruder_id: queueItem.extruder_id
          }]
        };
      }
      throw new Error(`No se encontró registro de mezcla o contenedor con identificador '${identifier}'.`);
    }

    const targetFolio = prep ? prep.folio : folio;
    let formula = null;
    if (prep) {
      formula = await Formula.findByPk(prep.formula_id);
      if (!formula) formula = await ProcessFormula.findByPk(prep.formula_id);
    }

    // 4. Obtener todos los contenedores pertenecientes a la mezcla
    const allContainers = await TraceableItem.findAll({
      where: { item_type: 'PREPARED_MIX', reference_folio: targetFolio },
      include: [{ model: QrCode, as: 'qr_code' }],
      order: [['id', 'ASC']]
    });

    const containers = allContainers.map((item, idx) => ({
      container_number: item.metadata?.container_number || (idx + 1),
      total_containers: item.metadata?.total_containers || allContainers.length,
      qr_code: item.qr_code?.qr_code || `CONT-${targetFolio}-${idx + 1}`,
      capacity_kg: Number(item.quantity_initial || ((prep?.total_quantity || 500) / allContainers.length)),
      formula_name: formula ? formula.name : 'Fórmula Extrusión',
      formula_code: formula ? (formula.code || '') : '',
      folio: targetFolio,
      extruder_id: item.metadata?.extruder_id || (prep?.to_area_id !== 2 ? prep?.to_area_id : null)
    }));

    return {
      folio: targetFolio,
      formula_name: formula ? formula.name : 'Fórmula Extrusión',
      formula_code: formula ? (formula.code || '') : '',
      total_quantity: Number(prep?.total_quantity || containers.reduce((acc, c) => acc + c.capacity_kg, 0) || 500),
      extruder_id: containers[0]?.extruder_id || (prep?.to_area_id !== 2 ? prep?.to_area_id : null),
      containers: containers.length > 0 ? containers : [{
        container_number: 1,
        total_containers: 1,
        qr_code: clean,
        capacity_kg: Number(prep?.total_quantity || 500),
        formula_name: formula ? formula.name : 'Fórmula Extrusión',
        formula_code: formula ? (formula.code || '') : '',
        folio: targetFolio,
        extruder_id: prep?.to_area_id !== 2 ? prep?.to_area_id : null
      }]
    };
  }

  // ==========================================
  // PISO DE EXTRUSIÓN & CONTROL DE COLAS (FASE 2)
  // ==========================================

  /**
   * Cambia la prioridad de una mezcla, pausando la activa y registrando merma de purga.
   */
  async switchQueuePriority({ extruder_id, target_queue_id, queue_id, scanned_qr, prioritize_formula_id, scrap_items = [], shift_code, notes, userId }) {
    const targetId = Number(target_queue_id || queue_id);
    if (!targetId) {
      const error = new Error('ID de la mezcla en cola a priorizar es obligatorio.');
      error.statusCode = 400;
      throw error;
    }

    const { ExtruderQueue, Formula, FormulaIngredient, Material, ExtrusionScrapLog, ExtrusionTransition, Extruder, PtiProduct, Lote, ProcessPreparation } = require('../../database/models');

    return await sequelize.transaction(async (t) => {
      // 1. Encontrar la mezcla que se quiere priorizar
      const targetQueue = await ExtruderQueue.findByPk(targetId, {
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (!targetQueue) {
        const error = new Error(`Elemento de cola #${targetId} no encontrado.`);
        error.statusCode = 404;
        throw error;
      }
      if (!['EN_ESPERA', 'PAUSADA', 'ACTIVA'].includes(targetQueue.status)) {
        const error = new Error(`No se puede activar una mezcla en estado ${targetQueue.status}.`);
        error.statusCode = 409;
        throw error;
      }
      this.validatePausedQueueScan(targetQueue, scanned_qr);

      const formula = await Formula.findByPk(targetQueue.formula_id, {
        include: [
          { model: FormulaIngredient, as: 'ingredients', include: [{ model: Material, as: 'material' }] },
          { model: PtiProduct, as: 'ptiProducts', attributes: ['id', 'code', 'name', 'color', 'formula_id', 'is_active'] },
        ],
        transaction: t
      });

      const machineId = Number(extruder_id || targetQueue.extruder_id);
      const targetExtruder = await Extruder.findByPk(machineId, { transaction: t });
      if (!targetExtruder || !targetExtruder.is_active) {
        const error = new Error(`Máquina ID ${machineId} no válida o inactiva en el piso de producción.`);
        error.statusCode = 400;
        throw error;
      }
      if (Number(targetQueue.extruder_id) !== machineId) {
        const error = new Error('La mezcla seleccionada pertenece a otra extrusora.');
        error.statusCode = 400;
        throw error;
      }

      // In group mode the selected QR must be the first waiting container for
      // that formula. This keeps the transition and scrap tied to the real
      // front container while the remaining formula entries move as a block.
      let formulaGroupWaiting = [];
      if (prioritize_formula_id != null) {
        const formulaId = Number(prioritize_formula_id);
        if (!Number.isInteger(formulaId) || formulaId !== Number(targetQueue.formula_id) || targetQueue.status !== 'EN_ESPERA') {
          const error = new Error('La fórmula seleccionada ya no coincide con el primer contenedor en espera. Actualiza la cola e inténtalo de nuevo.');
          error.statusCode = 409;
          throw error;
        }

        const allWaiting = await ExtruderQueue.findAll({
          where: { extruder_id: machineId, status: 'EN_ESPERA' },
          order: [['priority', 'DESC'], ['created_at', 'ASC'], ['id', 'ASC']],
          transaction: t,
          lock: t.LOCK.UPDATE
        });
        formulaGroupWaiting = allWaiting.filter((entry) => Number(entry.formula_id) === formulaId);
        if (!formulaGroupWaiting.length || Number(formulaGroupWaiting[0].id) !== Number(targetQueue.id)) {
          const error = new Error('La cola de esta fórmula cambió. Actualiza la vista antes de priorizar el grupo.');
          error.statusCode = 409;
          throw error;
        }
      }

      // 2. Regla 2: Restricciones de Fórmula en Extrusora 4 (POLIPROPILENO (B))
      if (machineId === 4 && formula) {
        const hasProhibitedPpb = (formula.ingredients || []).some(ing => {
          const matName = (ing.material?.name || '').toUpperCase();
          return ing.is_restricted_on_machine_4 || matName.includes('POLIPROPILENO (B)');
        });
        const isRestricted = (formula.restricted_extruders || []).includes(4);

        if (hasProhibitedPpb || isRestricted) {
          const error = new Error("Restricción de Máquina: La Extrusora 4 tiene estrictamente prohibido usar el material 'POLIPROPILENO (B)'. Intento bloqueado.");
          error.statusCode = 400;
          throw error;
        }
      }

      // 3. Buscar si hay una mezcla actualmente ACTIVA en esa extrusora
      const currentActive = await ExtruderQueue.findOne({
        where: {
          extruder_id: machineId,
          status: 'ACTIVA'
        },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      let transition = null;
      const scrapLogs = [];

      // 4. Regla 3 & 4: Si se interrumpe una mezcla activa, pasar a PAUSADA y exigir peso de merma de transición/purga
      if (currentActive && currentActive.id !== targetQueue.id) {
        if (!Array.isArray(scrap_items) || scrap_items.length === 0) {
          const error = new Error('Clasifica la merma de la transición por mezcla anterior, nueva, combinada o material de purga; no se asignará un peso sin origen.');
          error.statusCode = 400;
          throw error;
        }

        currentActive.status = 'PAUSADA';
        await currentActive.save({ transaction: t });
        transition = await ExtrusionTransition.create({
          extruder_id: machineId,
          from_queue_id: currentActive.id,
          to_queue_id: targetQueue.id,
          from_mixture_qr: currentActive.consumption_order_qr_id,
          to_mixture_qr: targetQueue.consumption_order_qr_id,
          shift_code: shift_code || 'TURNO_1',
          started_by: userId || null,
          notes: notes || null,
        }, { transaction: t });

        const previousFormula = await Formula.findByPk(currentActive.formula_id, {
          include: [{ model: PtiProduct, as: 'ptiProducts', attributes: ['id', 'code', 'name', 'color', 'formula_id', 'is_active'] }],
          transaction: t,
        });
        const [previousPreparation, targetPreparation] = await Promise.all([
          currentActive.process_preparation_id
            ? ProcessPreparation.findByPk(currentActive.process_preparation_id, { transaction: t, lock: t.LOCK.UPDATE })
            : null,
          targetQueue.process_preparation_id
            ? ProcessPreparation.findByPk(targetQueue.process_preparation_id, { transaction: t, lock: t.LOCK.UPDATE })
            : null,
        ]);
        const formulaColors = (formulaRecord) => [...new Set((formulaRecord?.ptiProducts || []).filter((pti) => pti.is_active && pti.color).map((pti) => String(pti.color).trim()).filter(Boolean))];
        const previousColors = formulaColors(previousFormula);
        const nextColors = formulaColors(formula);

        for (const item of scrap_items) {
          const estimatedWeight = Number(item.estimated_weight_kg ?? item.scrap_weight_kg ?? item.actual_weight_kg);
          const actualWeight = item.actual_weight_kg == null ? null : Number(item.actual_weight_kg);
          if (!['MEZCLA_ANTERIOR', 'MEZCLA_NUEVA', 'MEZCLA_MIXTA', 'MATERIAL_PURGA'].includes(item.category)) {
            throw Object.assign(new Error('Selecciona un origen válido para cada componente de merma de transición.'), { statusCode: 400 });
          }
          if ((!Number.isFinite(estimatedWeight) || estimatedWeight <= 0) && (!Number.isFinite(actualWeight) || actualWeight <= 0)) {
            const error = new Error('Cada componente de scrap requiere un peso estimado o real mayor a cero.');
            error.statusCode = 400;
            throw error;
          }
          const fromShare = item.from_mix_share == null ? null : Number(item.from_mix_share);
          const toShare = item.to_mix_share == null ? null : Number(item.to_mix_share);
          if ((fromShare !== null && (fromShare < 0 || fromShare > 100)) || (toShare !== null && (toShare < 0 || toShare > 100))) {
            const error = new Error('La proporción de cada mezcla debe estar entre 0 y 100%.');
            error.statusCode = 400;
            throw error;
          }
          if (item.category === 'MEZCLA_MIXTA' && (fromShare === null || toShare === null || fromShare <= 0 || toShare <= 0 || Math.abs(fromShare + toShare - 100) > 0.01)) {
            const error = new Error('Indica una proporción estimada mayor a cero para ambas mezclas; deben sumar 100%.');
            error.statusCode = 400;
            throw error;
          }
          let purgeLote = null;
          if (item.category === 'MATERIAL_PURGA') {
            if (!item.source_material_id || !item.source_lote_id) {
              throw Object.assign(new Error('La merma de material de purga requiere seleccionar el material y su lote.'), { statusCode: 400 });
            }
            purgeLote = await Lote.findOne({
              where: { id: item.source_lote_id, material_id: item.source_material_id, is_active: true, is_frozen: false },
              transaction: t,
              lock: t.LOCK.UPDATE,
            });
            if (!purgeLote) throw Object.assign(new Error('El lote de material de purga no existe, está inactivo o pertenece a otro material.'), { statusCode: 409 });
          }

          const previousMixCostPerKg = Number(previousPreparation?.transformed_cost_per_kg);
          const nextMixCostPerKg = Number(targetPreparation?.transformed_cost_per_kg);
          let scrapUnitCost = null;
          if (item.category === 'MATERIAL_PURGA') {
            scrapUnitCost = purgeLote?.unit_cost == null ? null : Number(purgeLote.unit_cost);
          } else if (item.category === 'MEZCLA_ANTERIOR' && Number.isFinite(previousMixCostPerKg) && previousMixCostPerKg > 0) {
            scrapUnitCost = previousMixCostPerKg;
          } else if (item.category === 'MEZCLA_NUEVA' && Number.isFinite(nextMixCostPerKg) && nextMixCostPerKg > 0) {
            scrapUnitCost = nextMixCostPerKg;
          } else if (item.category === 'MEZCLA_MIXTA'
            && Number.isFinite(previousMixCostPerKg) && previousMixCostPerKg > 0
            && Number.isFinite(nextMixCostPerKg) && nextMixCostPerKg > 0) {
            scrapUnitCost = Number(((previousMixCostPerKg * fromShare + nextMixCostPerKg * toShare) / 100).toFixed(6));
          }
          const weighedScrapKg = actualWeight ?? estimatedWeight;
          const scrapValuationStatus = actualWeight == null
            ? (scrapUnitCost == null ? 'PENDIENTE_COSTO' : 'PENDIENTE_PESAJE')
            : (scrapUnitCost == null ? 'PENDIENTE_COSTO' : 'VALUADO');

          const log = await ExtrusionScrapLog.create({
            extruder_id: machineId,
            transition_id: transition.id,
            from_mixture_qr_id: currentActive.consumption_order_qr_id,
            to_mixture_qr_id: targetQueue.consumption_order_qr_id,
            scrap_weight_kg: actualWeight ?? estimatedWeight,
            estimated_weight_kg: Number.isFinite(estimatedWeight) ? estimatedWeight : null,
            actual_weight_kg: actualWeight,
            reason: item.reason || item.category || 'PURGA_TRANSICION',
            category: item.category || 'MEZCLA_MIXTA',
            color: item.color || (item.category === 'MEZCLA_ANTERIOR'
              ? (previousColors.join(', ') || null)
              : item.category === 'MEZCLA_NUEVA'
                ? (nextColors.join(', ') || null)
                : item.category === 'MEZCLA_MIXTA'
                  ? `Anterior: ${previousColors.join(', ') || 'color no definido'} → Nueva: ${nextColors.join(', ') || 'color no definido'}`
                  : null),
            source_material_id: item.source_material_id || null,
            source_lote_id: item.source_lote_id || null,
            from_mix_share: fromShare,
            to_mix_share: toShare,
            shift_code: shift_code || 'TURNO_1',
            actual_weight_method: actualWeight == null ? 'ESTIMADO_POR_EVENTO' : 'PESAJE_DIRECTO',
            valuation_unit_cost: scrapUnitCost,
            valuation_total_cost: scrapUnitCost == null ? null : Number((weighedScrapKg * scrapUnitCost).toFixed(4)),
            valuation_status: scrapValuationStatus,
            weighed_by: actualWeight === null ? null : (userId || null),
            weighed_at: actualWeight === null ? null : new Date(),
            notes: item.notes || notes || null,
            logged_by: userId || null,
          }, { transaction: t });
          const estimatedDebits = await this.getScrapMixtureDebits(log, actualWeight ?? estimatedWeight, t);
          await this.applyPreparationDebitDelta([], estimatedDebits, t);
          log.mixture_consumption_applied = estimatedDebits.length > 0;
          await log.save({ transaction: t });
          if (item.category === 'MATERIAL_PURGA') {
            await this.reconcilePurgeMaterialStock({
              loteId: purgeLote.id,
              quantityDelta: actualWeight ?? estimatedWeight,
              userId,
              transaction: t,
              reason: `Purga en transición ${transition.id}`,
            });
          }
          scrapLogs.push(log);
        }
      } else if (currentActive?.id === targetQueue.id) {
        return { message: 'La mezcla ya está activa.', active_queue: currentActive, paused_queue: null, transition: null, scrap_logged: [] };
      } else {
        targetQueue.status = 'ACTIVA';
      }

      // 5. Iniciar la nueva mezcla con la más alta prioridad
      const maxPriority = (await ExtruderQueue.max('priority', { where: { extruder_id: machineId }, transaction: t })) || 0;
      targetQueue.status = 'ACTIVA';
      targetQueue.priority = Number(maxPriority) + (formulaGroupWaiting.length || 1);
      await targetQueue.save({ transaction: t });

      if (formulaGroupWaiting.length > 1) {
        // Keep the group's existing order immediately behind its new active
        // front. Other formulas' priorities and all sibling statuses/QRs stay
        // unchanged; only the selected formula block is reprioritized.
        for (let index = 1; index < formulaGroupWaiting.length; index += 1) {
          const sibling = formulaGroupWaiting[index];
          sibling.priority = Number(targetQueue.priority) - index;
          await sibling.save({ transaction: t });
        }
      }

      return {
        message: 'Mezcla activada y priorizada con éxito.',
        active_queue: targetQueue,
        paused_queue: currentActive && currentActive.id !== targetQueue.id ? currentActive : null,
      transition,
      scrap_logged: scrapLogs
      };
    });
  }

  /**
   * Valida el escaneo del QR del Rack y de la mezcla/PTI e ingresa material con Backflushing.
   * Puntos 5, 6, 7: Soporta ingreso directo por piezas o cálculo por peso de báscula y valorización.
   */
  async getPreparedMixTraceableItem(mixtureQr, transaction, lock = false) {
    if (!mixtureQr) return null;
    const { QrCode, TraceableItem } = require('../../database/models');
    const qr = await QrCode.findOne({ where: { qr_code: mixtureQr }, transaction });
    if (!qr) return null;
    return TraceableItem.findOne({
      where: { qr_code_id: qr.id, item_type: 'PREPARED_MIX' },
      transaction,
      ...(lock ? { lock: transaction.LOCK.UPDATE } : {}),
    });
  }

  async completeQueueIfDepleted(queue, preparation, containerTraceable, transaction) {
    if (!queue || queue.status === 'COMPLETADA') return { completed: false, reason: 'ALREADY_COMPLETED' };
    if (!containerTraceable && preparation?.id) {
      const { ExtruderQueue } = require('../../database/models');
      const siblings = await ExtruderQueue.count({ where: { process_preparation_id: preparation.id }, transaction });
      if (siblings > 1) return { completed: false, reason: 'PREPARATION_HAS_OTHER_CONTAINERS' };
    }
    const remainingKg = containerTraceable
      ? Number(containerTraceable.quantity_current)
      : preparation?.remaining_quantity_kg == null ? null : Number(preparation.remaining_quantity_kg);
    if (remainingKg == null || remainingKg > 0.001) return { completed: false, reason: 'MIX_REMAINS' };

    const { Op } = require('sequelize');
    const { ExtrusionScrapLog, TraceableItem } = require('../../database/models');
    const pendingScrap = await ExtrusionScrapLog.count({
      where: {
        actual_weight_kg: null,
        [Op.or]: [
          { from_mixture_qr_id: queue.consumption_order_qr_id },
          { to_mixture_qr_id: queue.consumption_order_qr_id },
        ],
      },
      transaction,
    });
    if (pendingScrap > 0) return { completed: false, reason: 'SCRAP_WEIGHING_PENDING' };

    queue.status = 'COMPLETADA';
    await queue.save({ transaction });
    if (containerTraceable && containerTraceable.status !== 'FINALIZADO') {
      containerTraceable.status = 'FINALIZADO';
      await containerTraceable.save({ transaction });
    }

    const { ExtruderQueue } = require('../../database/models');
    const anotherActiveQueue = await ExtruderQueue.findOne({
      where: { extruder_id: queue.extruder_id, status: 'ACTIVA' },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    let nextQueue = null;
    if (!anotherActiveQueue) {
      nextQueue = await ExtruderQueue.findOne({
        where: { extruder_id: queue.extruder_id, status: 'EN_ESPERA' },
        order: [['priority', 'DESC'], ['created_at', 'ASC'], ['id', 'ASC']],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (nextQueue) {
        nextQueue.status = 'ACTIVA';
        await nextQueue.save({ transaction });
      }
    }

    return { completed: true, completed_queue: queue, next_queue: nextQueue };
  }

  async scanRackPti({
    rack_qr,
    pti_material_id,
    quantity,
    weight_kg,
    unit_weight_kg,
    unit_price,
    mixture_qr,
    scrap_weight_kg = 0,
    estimated_scrap_weight_kg,
    scrap_reason = 'DESPERDICIO_OPERATIVO',
    scrap_category = 'OPERATIVA',
    scrap_color,
    shift_code,
    notes,
    userId
  }) {
    let pieces = Number(quantity);
    const scaleWeight = Number(weight_kg);

    const ptiId = Number(pti_material_id);
    if (!ptiId) {
      const error = new Error('ID de tipo de PTI es obligatorio.');
      error.statusCode = 400;
      throw error;
    }

    const { PtiRack, Material, Formula, FormulaIngredient, ExtruderQueue, Lote, ProcessPreparation, ExtrusionProductionEntry, ExtrusionScrapLog, Subarea, Area, PtiProduct } = require('../../database/models');
    const consumptionService = require('./services/consumption.service');

    return await sequelize.transaction(async (t) => {
      if (!mixture_qr) {
        const error = new Error('Selecciona el QR de la mezcla activa para atribuir la producción.');
        error.statusCode = 400;
        throw error;
      }

      const queueItem = await ExtruderQueue.findOne({
        where: { consumption_order_qr_id: mixture_qr },
        include: [{ model: Formula, as: 'formula', include: [{ model: FormulaIngredient, as: 'ingredients', include: [{ model: Material, as: 'material' }] }] }],
        transaction: t,
        // Lock only the queue row; the optional Formula LEFT JOIN is nullable.
        lock: { level: t.LOCK.UPDATE, of: ExtruderQueue },
      });
      if (!queueItem) {
        const error = new Error(`El QR de mezcla ${mixture_qr} no está asociado a una corrida de Extrusión.`);
        error.statusCode = 404;
        throw error;
      }
      if (queueItem.status !== 'ACTIVA') {
        const error = new Error(`La mezcla ${mixture_qr} no está activa; no se puede registrar producción con una mezcla en estado ${queueItem.status}.`);
        error.statusCode = 409;
        throw error;
      }
      const effectiveExtruderId = Number(queueItem.extruder_id);

      // 1. Buscar Rack por código QR o rack_code
      const rack = await PtiRack.findOne({
        where: {
          [sequelize.Sequelize.Op.or]: [
            { qr_code: rack_qr },
            { rack_code: rack_qr }
          ]
        },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (!rack) {
        const error = new Error(`Rack con código '${rack_qr}' no encontrado.`);
        error.statusCode = 404;
        throw error;
      }

      // Punto 5: Cálculo automático de piezas por peso en báscula si se ingresó peso
      let rackUnitWeight = Number(unit_weight_kg) || (Number(rack.current_quantity) > 0 ? Number(rack.unit_weight_kg) : 0);
      if (pieces > 0 && !Number.isInteger(pieces)) {
        const error = new Error('La cantidad de bobinas debe ser un número entero.');
        error.statusCode = 400;
        throw error;
      }

      const currentQty = Number(rack.current_quantity || 0);
      const maxCap = Number(rack.max_capacity || 100);

      const ptiProduct = await PtiProduct.findByPk(ptiId, {
        include: [{
          model: Formula,
          as: 'formula',
          include: [{ model: FormulaIngredient, as: 'ingredients', include: [{ model: Material, as: 'material' }] }]
        }],
        transaction: t
      });
      const effectiveMaterialId = ptiProduct?.material_id ? Number(ptiProduct.material_id) : null;
      if (!ptiProduct || !ptiProduct.is_active) {
        const error = new Error('El PTI seleccionado no existe o está inactivo.');
        error.statusCode = 400;
        throw error;
      }
      const linkedFormulaId = Number(ptiProduct.formula_id || 0);
      const declaredOutputPtiId = Number(queueItem.formula?.output_pti_id || 0);
      if (linkedFormulaId !== Number(queueItem.formula_id) && declaredOutputPtiId !== Number(ptiProduct.id)) {
        throw Object.assign(new Error(`El PTI ${ptiProduct.code} (${ptiProduct.color || 'color no definido'}) no está enlazado a la fórmula ${queueItem.formula?.name || queueItem.formula_id}. Selecciona un PTI compatible en el catálogo.`), { statusCode: 409 });
      }
      rackUnitWeight = Number(unit_weight_kg) || (currentQty > 0 ? Number(rack.unit_weight_kg) : Number(ptiProduct.unit_weight_kg)) || 0;
      if ((!pieces || pieces <= 0) && scaleWeight > 0 && rackUnitWeight > 0) pieces = Math.round(scaleWeight / rackUnitWeight);
      if (!pieces || pieces <= 0 || !Number.isInteger(pieces)) {
        throw Object.assign(new Error('Indica la cantidad entera de bobinas; el documento del cliente no incluye su peso unitario.'), { statusCode: 400 });
      }
      if (rackUnitWeight <= 0 && scaleWeight <= 0) {
        throw Object.assign(new Error('Registra el peso unitario del PTI o pesa esta producción en báscula para poder valorarla.'), { statusCode: 400 });
      }
      if (rackUnitWeight <= 0 && scaleWeight > 0) rackUnitWeight = Number((scaleWeight / pieces).toFixed(3));

      // 2. Validar capacidad del Rack
      if (rack.status === 'LLENO' || currentQty + pieces > maxCap) {
        const error = new Error(`Capacidad Excedida: El Rack ${rack.rack_code} no puede recibir ${pieces} piezas. Capacidad máxima: ${maxCap}, Disponible: ${Math.max(0, maxCap - currentQty)}.`);
        error.statusCode = 400;
        throw error;
      }
      // 3. Regla 5: Racks Dinámicos (Condicionamiento)
      if (currentQty > 0) {
        if (!rack.current_pti_product_id) {
          throw Object.assign(new Error(`El Rack ${rack.rack_code} contiene PTI registrado antes del control exacto de color. Termina o vacía ese rack antes de mezclar una fórmula/color nuevo.`), { statusCode: 409 });
        }
        if (Number(rack.current_pti_product_id) !== Number(ptiProduct.id)) {
          throw Object.assign(new Error(`El Rack ${rack.rack_code} está condicionado al PTI ${rack.current_pti_product_id}; el PTI ${ptiProduct.code} es otro producto/color. Usa un rack vacío.`), { statusCode: 409 });
        }
      } else {
        rack.current_pti_type_id = effectiveMaterialId;
        rack.current_pti_product_id = ptiProduct.id;
      }

      const areaTelares = await Area.findOne({ where: { code: 'TELARES' }, transaction: t });
      const bandaSubarea = areaTelares && await Subarea.findOne({
        where: { area_id: areaTelares.id, nomenclature: 'TB', is_active: true },
        transaction: t,
      });
      const destinationSubareaId = effectiveExtruderId === 1 ? (bandaSubarea?.id || null) : null;
      if (rack.current_quantity > 0 && Number(rack.destination_subarea_id || 0) !== Number(destinationSubareaId || 0)) {
        const error = new Error(`El Rack ${rack.rack_code} ya está asignado a otro destino de Telares; usa un rack distinto para evitar mezclar rutas.`);
        error.statusCode = 409;
        throw error;
      }
      rack.destination_subarea_id = destinationSubareaId;

      // 4. Actualizar cantidad
      rack.current_quantity = currentQty + pieces;
      rack.unit_weight_kg = rackUnitWeight;

      // 5. Backflushing y Fórmula
      let formula = null;

      if (ptiProduct) {
        if (!formula && ptiProduct.formula) {
          formula = ptiProduct.formula;
        }
      }

      formula = queueItem.formula || formula;
      // El silo se consume en la preparación de mezcla. La extrusora solo recibe
      // el contenedor trazable y nunca consulta ni descuenta inventario de silo.

      const preparation = queueItem.process_preparation_id
        ? await ProcessPreparation.findByPk(queueItem.process_preparation_id, { transaction: t, lock: t.LOCK.UPDATE })
        : null;
      if (queueItem.process_preparation_id && !preparation) {
        const error = new Error('La corrida apunta a una preparación inexistente.');
        error.statusCode = 409;
        throw error;
      }

      const netWeightKg = scaleWeight > 0 ? scaleWeight : Number((pieces * rackUnitWeight).toFixed(3));
      const weightSource = scaleWeight > 0 ? 'BASCULA' : 'ESTIMADO';
      const scrapKg = Math.max(0, Number(scrap_weight_kg) || Number(estimated_scrap_weight_kg) || 0);
      const consumedMixtureKg = netWeightKg + scrapKg;
      const containerTraceable = await this.getPreparedMixTraceableItem(mixture_qr, t, true);
      const containerRemainingKg = containerTraceable ? Number(containerTraceable.quantity_current) : null;
      if (preparation?.remaining_quantity_kg != null && Number(preparation.remaining_quantity_kg) < consumedMixtureKg) {
        const error = new Error(`Mezcla insuficiente. Saldo ${Number(preparation.remaining_quantity_kg).toFixed(3)} kg; producción y merma solicitan ${consumedMixtureKg.toFixed(3)} kg.`);
        error.statusCode = 409;
        throw error;
      }
      if (containerRemainingKg != null && containerRemainingKg + 0.001 < consumedMixtureKg) {
        throw Object.assign(new Error(`El contenedor ${mixture_qr} tiene ${containerRemainingKg.toFixed(3)} kg; no alcanza para registrar ${consumedMixtureKg.toFixed(3)} kg entre PTI y merma.`), { statusCode: 409 });
      }

      // Descuento de materiales vía Backflushing
      let backflushingResult = null;
      let siloDeductionResult = null;

      if (preparation?.remaining_quantity_kg != null) {
        preparation.remaining_quantity_kg = Number((Number(preparation.remaining_quantity_kg) - consumedMixtureKg).toFixed(3));
        await preparation.save({ transaction: t });
        backflushingResult = {
          mode: 'MEZCLA_TRANSFORMADA',
          produced_pieces: pieces,
          actual_or_estimated_output_kg: netWeightKg,
          weight_source: weightSource,
          remaining_mixture_kg: Number(preparation.remaining_quantity_kg),
        };
      } else if (formula) {
        // Corridas anteriores a la trazabilidad por preparación: estimar sin volver a descontar MP/Silo.
        backflushingResult = consumptionService.calculateBackflushing({
          formula,
          pieces,
          scrapWeightKg: 0,
          isSiloMode: false,
        });
        backflushingResult.legacy_estimate_only = true;
      }
      if (containerTraceable && containerRemainingKg != null) {
        containerTraceable.quantity_current = Math.max(0, Number((containerRemainingKg - consumedMixtureKg).toFixed(3)));
        containerTraceable.status = containerTraceable.quantity_current <= 0.001 ? 'CONSUMIDO' : 'EN_PROCESO';
        containerTraceable.updated_by = userId || null;
        await containerTraceable.save({ transaction: t });
      }

      const mixtureCostPerKg = preparation?.transformed_cost_per_kg == null
        ? null
        : Number(preparation.transformed_cost_per_kg);
      const transformedCostIndex = Number(ptiProduct.transformed_cost_index || 1);
      const ptiTransformedCostPerKg = mixtureCostPerKg == null
        ? null
        : Number((mixtureCostPerKg * transformedCostIndex).toFixed(6));
      const productionEntry = await ExtrusionProductionEntry.create({
        process_preparation_id: preparation?.id || null,
        queue_id: queueItem.id,
        extruder_id: effectiveExtruderId,
        destination_subarea_id: destinationSubareaId,
        mixture_qr: mixture_qr,
        rack_id: rack.id,
        pti_product_id: ptiProduct.id,
        pti_color_snapshot: ptiProduct.color || null,
        pieces,
        net_weight_kg: netWeightKg,
        weight_source: weightSource,
        mixture_cost_per_kg: mixtureCostPerKg,
        transformed_cost_index_snapshot: transformedCostIndex,
        pti_transformed_cost_per_kg: ptiTransformedCostPerKg,
        production_value: ptiTransformedCostPerKg == null ? null : Number((netWeightKg * ptiTransformedCostPerKg).toFixed(4)),
        recorded_by: userId || null,
        notes: notes || null,
      }, { transaction: t });

      // El QR del rack es la salida PTI del proceso. Conservar aquí la liga
      // mezcla -> PTI permite recorrer en el escaneo la genealogía hasta los
      // lotes originales, incluyendo la merma separada de la salida neta.
      const extrusionArea = await Area.findOne({ where: { code: 'EXTRUSION' }, transaction: t });
      if (!extrusionArea) {
        throw Object.assign(new Error('No existe el área EXTRUSION para registrar la trazabilidad del PTI.'), { statusCode: 409 });
      }
      let rackQr = await QrCode.findOne({ where: { qr_code: rack.qr_code }, transaction: t, lock: t.LOCK.UPDATE });
      if (!rackQr) {
        let qrBatch = await QrBatch.findOne({ order: [['id', 'DESC']], transaction: t });
        if (!qrBatch) {
          qrBatch = await QrBatch.create({
            batch_code: `BATCH-PTI-RACK-${Date.now()}`,
            quantity: 1,
            assigned_area_id: extrusionArea.id,
            status: 'AVAILABLE',
            created_by: userId || 1,
          }, { transaction: t });
        }
        rackQr = await QrCode.create({
          serial: Date.now() + Math.floor(Math.random() * 1000),
          qr_code: rack.qr_code,
          batch_id: qrBatch.id,
          purpose: 'PTI_RACK',
          assigned_area_id: extrusionArea.id,
          status: 'IN_USE',
          created_by: userId || 1,
        }, { transaction: t });
      }
      let rackTraceable = await TraceableItem.findOne({ where: { qr_code_id: rackQr.id }, transaction: t, lock: t.LOCK.UPDATE });
      const previousRackKg = rackTraceable ? Number(rackTraceable.quantity_current) : 0;
      const newRackKg = Number((previousRackKg + netWeightKg).toFixed(3));
      if (!rackTraceable) {
        rackTraceable = await TraceableItem.create({
          qr_code_id: rackQr.id,
          item_type: 'INTERMEDIATE_PRODUCT',
          material_id: effectiveMaterialId,
          product_name: ptiProduct.name,
          origin_area_id: extrusionArea.id,
          current_area_id: extrusionArea.id,
          quantity_initial: netWeightKg,
          quantity_current: netWeightKg,
          unit: 'KG',
          status: 'DISPONIBLE',
          reference_folio: preparation?.folio || mixture_qr,
          created_by: userId || null,
          metadata: { rack_code: rack.rack_code, pti_product_id: ptiProduct.id, pti_code: ptiProduct.code, color: ptiProduct.color || null },
        }, { transaction: t });
      } else {
        rackTraceable.quantity_initial = Number((Number(rackTraceable.quantity_initial) + netWeightKg).toFixed(3));
        rackTraceable.quantity_current = newRackKg;
        rackTraceable.status = 'DISPONIBLE';
        rackTraceable.material_id = effectiveMaterialId;
        rackTraceable.product_name = ptiProduct.name;
        rackTraceable.updated_by = userId || null;
        rackTraceable.metadata = {
          ...(rackTraceable.metadata || {}),
          rack_code: rack.rack_code,
          pti_product_id: ptiProduct.id,
          pti_code: ptiProduct.code,
          color: ptiProduct.color || null,
          last_production_entry_id: productionEntry.id,
        };
        await rackTraceable.save({ transaction: t });
      }
      if (containerTraceable) {
        await TraceabilityLink.create({
          parent_traceable_item_id: containerTraceable.id,
          child_traceable_item_id: rackTraceable.id,
          parent_qr_code_id: containerTraceable.qr_code_id,
          child_qr_code_id: rackQr.id,
          link_type: 'TRANSFORMACION',
          quantity_used: consumedMixtureKg,
          quantity_generated: netWeightKg,
          scrap_quantity: scrapKg,
          unit: 'KG',
          process_area_id: extrusionArea.id,
          notes: `Salida PTI ${ptiProduct.code} (${netWeightKg.toFixed(3)} kg) al rack ${rack.rack_code}; merma asociada ${scrapKg.toFixed(3)} kg.`,
          metadata: { production_entry_id: productionEntry.id, process_preparation_id: preparation?.id || null, extruder_id: effectiveExtruderId, pti_product_id: ptiProduct.id, color: ptiProduct.color || null, weight_source: weightSource },
          created_by: userId || null,
        }, { transaction: t });
      }
      await TraceabilityMovement.create({
        traceable_item_id: rackTraceable.id,
        qr_code_id: rackQr.id,
        movement_type: 'GENERACION_INTERMEDIA',
        from_area_id: extrusionArea.id,
        to_area_id: extrusionArea.id,
        quantity: netWeightKg,
        unit: 'KG',
        balance_after: newRackKg,
        reference_folio: preparation?.folio || mixture_qr,
        performed_by: userId || null,
        notes: `Producción de ${pieces} bobina(s) de ${ptiProduct.code} en ${rack.rack_code}.`,
        metadata: { production_entry_id: productionEntry.id, scrap_weight_kg: scrapKg, mixture_qr },
      }, { transaction: t });
      await TraceabilityEvent.create({
        qr_code_id: rackQr.id,
        event_type: 'PRODUCCION_EXTRUSION',
        entity_type: 'ExtrusionProductionEntry',
        entity_id: String(productionEntry.id),
        from_status: rackQr.status,
        to_status: 'IN_WIP',
        performed_by: userId || null,
        notes: `Ingreso de ${pieces} bobina(s) ${ptiProduct.code} al rack ${rack.rack_code}.`,
        metadata: { production_entry_id: productionEntry.id, mixture_qr, net_weight_kg: netWeightKg, scrap_weight_kg: scrapKg, pti_product_id: ptiProduct.id, color: ptiProduct.color || null },
      }, { transaction: t });

      // Puntos 3, 3.1 & 6: Valorización del PTI (con precio de catálogo o cálculo con cost_index)
      let calculatedPtiPrice = Number(unit_price) || (ptiProduct && Number(ptiProduct.unit_price) > 0 ? Number(ptiProduct.unit_price) : 0) || Number(rack.unit_price) || 0;
      if (calculatedPtiPrice <= 0 && preparation?.transformed_value_snapshot != null) {
        const expectedPieces = Number(formula?.expected_yield_pieces || 0);
        if (expectedPieces > 0) calculatedPtiPrice = Number((Number(preparation.transformed_value_snapshot) / expectedPieces).toFixed(2));
      }

      if (calculatedPtiPrice > 0) {
        rack.unit_price = calculatedPtiPrice;
      }

      if (ptiTransformedCostPerKg != null) {
        const previousUnitWeight = currentQty > 0 ? Number(rack.unit_weight_kg || 0) : 0;
        const previousKg = currentQty > 0 && previousUnitWeight > 0 ? currentQty * previousUnitWeight : 0;
        const previousValue = previousKg > 0 && rack.unit_cost_per_kg != null
          ? previousKg * Number(rack.unit_cost_per_kg)
          : null;
        if (currentQty === 0) rack.unit_cost_per_kg = ptiTransformedCostPerKg;
        else if (previousValue != null && previousKg + netWeightKg > 0) {
          rack.unit_cost_per_kg = Number(((previousValue + netWeightKg * ptiTransformedCostPerKg) / (previousKg + netWeightKg)).toFixed(6));
        }
      }

      await rack.save({ transaction: t });

      let scrapLog = null;
      if (scrapKg > 0) {
        const { ExtrusionScrapLog } = require('../../database/models');
        scrapLog = await ExtrusionScrapLog.create({
          extruder_id: effectiveExtruderId,
            from_mixture_qr_id: mixture_qr,
          to_mixture_qr_id: null,
            scrap_weight_kg: scrapKg,
            estimated_weight_kg: estimated_scrap_weight_kg == null ? null : scrapKg,
            actual_weight_kg: estimated_scrap_weight_kg == null ? scrapKg : null,
            reason: scrap_reason || 'DESPERDICIO_OPERATIVO',
            category: scrap_category,
            color: scrap_color || null,
            shift_code: shift_code || 'TURNO_1',
            valuation_unit_cost: mixtureCostPerKg,
            valuation_total_cost: mixtureCostPerKg == null ? null : Number((scrapKg * mixtureCostPerKg).toFixed(4)),
            valuation_status: mixtureCostPerKg == null ? 'PENDIENTE_COSTO' : (estimated_scrap_weight_kg == null ? 'VALUADO' : 'PENDIENTE_PESAJE'),
            mixture_consumption_applied: Boolean(preparation || containerTraceable),
            actual_weight_method: estimated_scrap_weight_kg == null ? 'PESAJE_DIRECTO' : 'ESTIMADO_POR_EVENTO',
            weighed_by: estimated_scrap_weight_kg == null ? (userId || null) : null,
            weighed_at: estimated_scrap_weight_kg == null ? new Date() : null,
            notes: notes || null,
            logged_by: userId || null
        }, { transaction: t });
      }

      const queueCompletion = await this.completeQueueIfDepleted(queueItem, preparation, containerTraceable, t);

      return {
        message: `Ingreso registrado: ${pieces} piezas almacenadas en ${rack.rack_code}.${scaleWeight ? ` (Báscula: ${scaleWeight} kg @ ${rackUnitWeight} kg/pza).` : ''}${scrapKg > 0 ? ` Merma: ${scrapKg} kg.` : ''}${siloDeductionResult ? ` Silo ${siloDeductionResult.silo_code}: -${siloDeductionResult.deducted_kg} kg.` : ''}`,
        rack: {
          id: rack.id,
          rack_code: rack.rack_code,
          qr_code: rack.qr_code,
          current_quantity: Number(rack.current_quantity),
          max_capacity: Number(rack.max_capacity),
          status: rack.status,
          current_pti_type_id: rack.current_pti_type_id,
          unit_price: Number(rack.unit_price || 0),
          unit_weight_kg: rack.unit_weight_kg == null ? null : Number(rack.unit_weight_kg),
          unit_cost_per_kg: rack.unit_cost_per_kg == null ? null : Number(rack.unit_cost_per_kg),
          total_value: rack.unit_cost_per_kg != null && Number(rack.unit_weight_kg || 0) > 0
            ? Number((Number(rack.current_quantity) * Number(rack.unit_weight_kg) * Number(rack.unit_cost_per_kg)).toFixed(2))
            : Number((Number(rack.current_quantity) * Number(rack.unit_price || 0)).toFixed(2))
        },
        backflushing: backflushingResult,
        silo_deduction: siloDeductionResult,
        production_entry: productionEntry,
        scrap_logged: scrapLog,
        queue_completion: queueCompletion,
        destination_subarea: destinationSubareaId ? { id: destinationSubareaId, name: 'TELARES BANDA' } : { id: null, name: 'TELARES' },
      };
    });
  }

  /**
   * Obtiene las colas de las extrusoras dinámicamente desde el catálogo de extruders.
   */
  async getExtruderQueues() {
    const { Extruder, Silo, ExtruderQueue, Formula, FormulaIngredient, Material, ProcessPreparation, QrCode, TraceableItem, PtiProduct } = require('../../database/models');

    const queues = await ExtruderQueue.findAll({
      include: [
        {
          model: Formula,
          as: 'formula',
          include: [
            { model: FormulaIngredient, as: 'ingredients', include: [{ model: Material, as: 'material' }] },
            { model: PtiProduct, as: 'ptiProducts', attributes: ['id', 'code', 'name', 'color', 'formula_id', 'is_active'] },
          ]
        },
        { model: ProcessPreparation, as: 'preparation', attributes: ['id', 'total_quantity', 'remaining_quantity_kg'] },
      ],
      order: [
        ['extruder_id', 'ASC'],
        ['priority', 'DESC'],
        ['created_at', 'ASC']
      ]
    });

    const extruders = await Extruder.findAll({ where: { is_active: true }, order: [['id', 'ASC']] });

    const qrRows = queues.length ? await QrCode.findAll({ where: { qr_code: [...new Set(queues.map((queue) => queue.consumption_order_qr_id))] }, attributes: ['id', 'qr_code'] }) : [];
    const traceables = qrRows.length ? await TraceableItem.findAll({ where: { qr_code_id: qrRows.map((qr) => qr.id), item_type: 'PREPARED_MIX' }, attributes: ['qr_code_id', 'quantity_initial', 'quantity_current'] }) : [];
    const traceableByQr = new Map(traceables.map((item) => [Number(item.qr_code_id), item]));
    const qrIdByCode = new Map(qrRows.map((qr) => [qr.qr_code, Number(qr.id)]));
    const queueView = (queue) => {
      const item = queue.toJSON();
      const tracked = traceableByQr.get(qrIdByCode.get(queue.consumption_order_qr_id));
      item.container_remaining_quantity_kg = tracked ? Number(tracked.quantity_current) : null;
      return item;
    };

    return extruders.map(ext => {
      const machineQueues = queues.filter(q => q.extruder_id === ext.id);
      const active = machineQueues.find(q => q.status === 'ACTIVA') || null;
      const paused = machineQueues.filter(q => q.status === 'PAUSADA');
      const waiting = machineQueues.filter(q => q.status === 'EN_ESPERA');
      const sameFormulaBatches = active
        ? machineQueues.filter((queue) => Number(queue.formula_id) === Number(active.formula_id) && ['ACTIVA', 'EN_ESPERA', 'PAUSADA'].includes(queue.status))
        : [];
      const seenPreparations = new Set();
      const trackedPreparations = new Set(sameFormulaBatches
        .filter((queue) => traceableByQr.has(qrIdByCode.get(queue.consumption_order_qr_id)))
        .map((queue) => Number(queue.process_preparation_id))
        .filter(Boolean));
      const groupedQuantityKg = sameFormulaBatches.reduce((sum, queue) => {
        const tracked = traceableByQr.get(qrIdByCode.get(queue.consumption_order_qr_id));
        if (tracked) return sum + Number(tracked.quantity_current || 0);
        const prepId = queue.process_preparation_id;
        if (prepId && trackedPreparations.has(Number(prepId))) return sum;
        if (prepId && seenPreparations.has(Number(prepId))) return sum;
        if (prepId) seenPreparations.add(Number(prepId));
        return sum + Number(queue.preparation?.remaining_quantity_kg ?? queue.preparation?.total_quantity ?? queue.formula?.batch_size_kg ?? 0);
      }, 0);
      const batchCount = new Set(sameFormulaBatches.map((queue) => queue.process_preparation_id || `queue-${queue.id}`)).size;

      return {
        machine: {
          id: ext.id,
          code: ext.code,
          name: ext.name,
          type: ext.type,
          status: ext.status,
        },
        active: active ? queueView(active) : null,
        active_formula_group: active ? {
          formula_id: active.formula_id,
          formula_name: active.formula?.name || null,
          batch_count: batchCount,
          quantity_kg: Number(groupedQuantityKg.toFixed(3)),
          mixture_qrs: sameFormulaBatches.map((queue) => queue.consumption_order_qr_id),
        } : null,
        paused: paused.map(queueView),
        waiting: waiting.map(queueView),
        // Historical/completed rows are kept in this table, but they are not
        // assigned to the machine's operational queue and must not inflate the
        // count shown in the production board.
        total_in_queue: (active ? 1 : 0) + paused.length + waiting.length
      };
    });
  }

  async getPurgeMaterialCatalog() {
    const { Material } = require('../../database/models');
    return Material.findAll({ where: { is_active: true }, attributes: ['id', 'name'], order: [['name', 'ASC']] });
  }

  async getPurgeMaterialLots(materialId) {
    const { Material, Lote } = require('../../database/models');
    const material = await Material.findByPk(Number(materialId), { attributes: ['id'] });
    if (!material) throw Object.assign(new Error('Material de purga no encontrado.'), { statusCode: 404 });
    return Lote.findAll({
      where: { material_id: material.id, is_active: true, is_frozen: false },
      attributes: ['id', 'folio', 'available_amount', 'unit_cost', 'is_active'],
      order: [['date_received', 'DESC']],
    }).then((lots) => lots.filter((lot) => Number(lot.available_amount) > 0));
  }

  /**
   * Encola una mezcla ya preparada en una extrusora compatible.
   */
  async enqueueMix({ extruder_id, consumption_order_qr_id, formula_id, priority = 1, notes }) {
    const machineId = Number(extruder_id);
    const { Extruder, ExtruderFormula, ExtruderQueue, Formula, FormulaIngredient, Material, ProcessPreparation, QrCode } = require('../../database/models');

    const extruder = await Extruder.findByPk(machineId);

    if (!extruder && ![1, 2, 3, 4, 5, 6].includes(machineId)) {
      const error = new Error('Máquina no válida.');
      error.statusCode = 400;
      throw error;
    }

    const formula = await Formula.findByPk(formula_id, {
      include: [{ model: FormulaIngredient, as: 'ingredients', include: [{ model: Material, as: 'material' }] }]
    });

    if (!formula) {
      const error = new Error('Fórmula especificada no encontrada.');
      error.statusCode = 404;
      throw error;
    }

    const existingQueue = await ExtruderQueue.findOne({
      where: { consumption_order_qr_id, status: { [sequelize.Sequelize.Op.notIn]: ['COMPLETADA', 'CANCELADA'] } },
    });
    if (existingQueue) {
      throw Object.assign(new Error(`El contenedor ${consumption_order_qr_id} ya está en la cola ${existingQueue.id}.`), { statusCode: 409 });
    }

    // A prepared mix QR is the production container identity. Preserve its
    // preparation link so transition scrap, consumption, FIFO history, and
    // queue depletion all reconcile against the same batch.
    const sourceQr = await QrCode.findOne({ where: { qr_code: consumption_order_qr_id }, attributes: ['id'] });
    const preparation = sourceQr && await ProcessPreparation.findOne({
      where: { destination_qr_code_id: sourceQr.id },
      order: [['id', 'DESC']],
    });
    if (preparation && Number(preparation.formula_id) !== Number(formula.id)) {
      throw Object.assign(new Error(`El QR ${consumption_order_qr_id} pertenece a una mezcla de otra fórmula.`), { statusCode: 409 });
    }

    // Restricción Extrusora 4: PROHIBIDO PP-B en la mezcla preparada.
    if (machineId === 4) {
      const hasProhibitedPpb = (formula.ingredients || []).some(ing => {
        const matName = (ing.material?.name || '').toUpperCase();
        return ing.is_restricted_on_machine_4 || matName.includes('POLIPROPILENO (B)');
      });
      const isRestricted = (formula.restricted_extruders || []).includes(4);

      if (hasProhibitedPpb || isRestricted) {
        const error = new Error("Restricción de Máquina: La Extrusora 4 tiene estrictamente prohibido procesar fórmulas que contengan 'POLIPROPILENO (B)'. Intento bloqueado.");
        error.statusCode = 400;
        throw error;
      }

    }

    // Matriz de compatibilidad
    const matrixCount = await ExtruderFormula.count({ where: { extruder_id: machineId } });
    if (matrixCount > 0) {
      const isAllowedInMatrix = await ExtruderFormula.findOne({
        where: { extruder_id: machineId, formula_id: formula.id, is_allowed: true }
      });
      if (!isAllowedInMatrix) {
        const error = new Error(`Matriz de Compatibilidad: La fórmula '${formula.name}' no está autorizada para la Extrusora ${machineId}. Intento bloqueado.`);
        error.statusCode = 400;
        throw error;
      }
    } else {
      if (formula.restricted_extruders && formula.restricted_extruders.includes(machineId)) {
        const error = new Error(`Restricción de Máquina: La Extrusora ${machineId} tiene estrictamente prohibido procesar la fórmula '${formula.name}'. Intento bloqueado.`);
        error.statusCode = 400;
        throw error;
      }
      if (formula.allowed_extruders && formula.allowed_extruders.length > 0 && !formula.allowed_extruders.includes(machineId)) {
        const error = new Error(`Restricción de Máquina: La Extrusora ${machineId} no está autorizada para la fórmula '${formula.name}'. Máquinas permitidas: [${formula.allowed_extruders.join(', ')}]. Intento bloqueado.`);
        error.statusCode = 400;
        throw error;
      }
    }

    const newQueue = await ExtruderQueue.create({
      extruder_id: machineId,
      consumption_order_qr_id,
      formula_id,
      process_preparation_id: preparation?.id || null,
      priority: Number(priority) || 1,
      status: 'EN_ESPERA',
      // Legacy column retained for schema compatibility. Silos feed the mixer,
      // and every queue item represents a complete prepared mixture.
      is_silo_kit: false,
      notes
    });

    return newQueue;
  }

  /**
   * Crea un nuevo Rack de PTI en piso de extrusión.
   * Punto 5: Autogenera un QR fijo e inserta el registro en QrCodes.
   * Puntos 6 y 7: Soporta precio unitario y peso unitario por pieza.
   */
  async createPtiRack({ rack_code, max_capacity = 100, location_name, unit_price = 0, unit_weight_kg = null }) {
    const { PtiRack, QrCode, QrBatch } = require('../../database/models');
    const existing = await PtiRack.findOne({ where: { rack_code } });
    if (existing) {
      const error = new Error(`El Rack '${rack_code}' ya existe en el sistema.`);
      error.statusCode = 400;
      throw error;
    }
    const cleanCode = rack_code.trim().toUpperCase();
    const qr_code = cleanCode.startsWith('QR-') ? cleanCode : `QR-${cleanCode}`;

    let qrBatch = await QrBatch.findOne();
    if (!qrBatch) {
      qrBatch = await QrBatch.create({
        code: `BATCH-${Date.now()}`,
        batch_type: 'PROCESS',
        prefix: 'PRC',
        start_serial: 1,
        end_serial: 10000,
        quantity: 10000,
        status: 'ACTIVE',
        created_by: 1
      });
    }

    // Punto 5: Autogenerar QR fijo en el catálogo para escaneo unificado
    await QrCode.findOrCreate({
      where: { qr_code },
      defaults: {
        serial: Math.floor(Date.now() / 1000),
        batch_id: qrBatch.id,
        created_by: 1,
        status: 'IN_USE',
        purpose: 'PTI_RACK',
        is_active: true
      }
    });

    return await PtiRack.create({
      rack_code: cleanCode,
      qr_code,
      max_capacity: Number(max_capacity) || 100,
      current_quantity: 0,
      unit_price: Number(unit_price) || 0.00,
      unit_weight_kg: unit_weight_kg == null || unit_weight_kg === '' ? null : Number(unit_weight_kg),
      status: 'VACIO',
      location_name: location_name || 'Piso Extrusión'
    });
  }

  /**
   * Puntos 6 y 7: Actualiza precio unitario y peso unitario de un Rack PTI.
   */
  async updatePtiRackPrice(rackId, { unit_price, unit_weight_kg }) {
    const { PtiRack, Material } = require('../../database/models');
    const rack = await PtiRack.findByPk(rackId, {
      include: [{ model: Material, as: 'currentPtiType' }]
    });
    if (!rack) {
      const error = new Error('Rack no encontrado');
      error.statusCode = 404;
      throw error;
    }
    if (unit_price !== undefined) rack.unit_price = Number(unit_price) || 0;
    if (unit_weight_kg !== undefined) {
      const weight = unit_weight_kg == null || unit_weight_kg === '' ? null : Number(unit_weight_kg);
      if (weight !== null && (!Number.isFinite(weight) || weight <= 0)) throw Object.assign(new Error('El peso unitario debe ser mayor a cero o quedar vacío.'), { statusCode: 400 });
      rack.unit_weight_kg = weight;
    }
    await rack.save();
    return rack;
  }

  /**
   * Obtiene todos los Racks de PTI con sus estados actuales y valorización total.
   */
  async getPtiRacks() {
    const { PtiRack, Material, PtiProduct, Formula } = require('../../database/models');
    const racks = await PtiRack.findAll({
      include: [
        { model: Material, as: 'currentPtiType' },
        {
          model: PtiProduct,
          as: 'currentPtiProduct',
          include: [{ model: Formula, as: 'formula', attributes: ['id', 'code', 'name', 'cost_index'] }]
        }
      ],
      order: [['rack_code', 'ASC']]
    });

    return racks.map(r => {
      const plain = r.toJSON();
      const qty = Number(plain.current_quantity || 0);
      const price = Number(plain.unit_price || plain.currentPtiProduct?.unit_price || 0);
      plain.unit_price = price;
      const unitWeight = Number(plain.unit_weight_kg || plain.currentPtiProduct?.unit_weight_kg || 0);
      plain.unit_weight_kg = unitWeight > 0 ? unitWeight : null;
      const unitCostPerKg = Number(plain.unit_cost_per_kg || 0);
      const transformedCostValue = unitCostPerKg > 0 && unitWeight > 0 ? qty * unitWeight * unitCostPerKg : null;
      const tare = Number(plain.tare_weight_kg ?? 25.0);
      const netWeight = Number((qty * (unitWeight || 0)).toFixed(2));
      const grossWeight = Number((tare + netWeight).toFixed(2));
      plain.tare_weight_kg = tare;
      plain.net_weight_kg = netWeight;
      plain.gross_weight_kg = grossWeight;
      plain.container_type = plain.container_type || 'CARRITO';
      plain.total_value = Number((transformedCostValue ?? qty * price).toFixed(2));
      plain.transformed_cost_value = transformedCostValue == null ? null : Number(transformedCostValue.toFixed(2));
      plain.pti_product_name = plain.currentPtiProduct?.name || plain.currentPtiType?.name || (plain.current_pti_type_id ? `PTI #${plain.current_pti_type_id}` : 'Libre');
      return plain;
    });
  }

  /**
   * Punto 4: Divide una mezcla (de 500kg u otra cantidad) en 2 o más contenedores con QRs hijos.
   * Cada contenedor hijo conserva trazabilidad de la mezcla padre y su proporción de materiales.
   */
  async splitMixtureContainers({ parent_mixture_qr, containers, notes, userId }) {
    if (!parent_mixture_qr || !Array.isArray(containers) || containers.length < 2) {
      const error = new Error('Debes proporcionar el código QR de la mezcla padre y al menos 2 contenedores.');
      error.statusCode = 400;
      throw error;
    }

    const { QrCode, QrBatch, ProcessPreparation, ProcessPreparationInput, TraceabilityEvent } = require('../../database/models');

    return await sequelize.transaction(async (t) => {
      let qrBatch = await QrBatch.findOne({ transaction: t });
      if (!qrBatch) {
        qrBatch = await QrBatch.create({
          code: `BATCH-${Date.now()}`,
          batch_type: 'PROCESS',
          prefix: 'PRC',
          start_serial: 1,
          end_serial: 10000,
          quantity: 10000,
          status: 'ACTIVE',
          created_by: userId || 1
        }, { transaction: t });
      }

      let prep = await ProcessPreparation.findOne({
        where: { folio: parent_mixture_qr },
        include: [{ model: ProcessPreparationInput, as: 'inputs', required: false }],
        transaction: t
      });

      const parentTotalWeight = prep ? Number(prep.total_quantity) : 500.00;
      const splitResults = [];
      const now = new Date();

      for (let i = 0; i < containers.length; i++) {
        const c = containers[i];
        const containerNum = c.container_number || (i + 1);
        const childQr = `${parent_mixture_qr}-C${containerNum}`;
        const containerWeight = Number(c.weight_kg) || Number((parentTotalWeight / containers.length).toFixed(2));

        // Crear QR para el contenedor hijo
        const [qrRecord] = await QrCode.findOrCreate({
          where: { qr_code: childQr },
          defaults: {
            serial: Math.floor(Date.now() / 1000) * 100 + containerNum,
            batch_id: qrBatch.id,
            created_by: userId || 1,
            status: 'ASSIGNED',
            purpose: 'MIXTURE_CONTAINER',
            is_active: true
          },
          transaction: t
        });

        // Registrar evento de trazabilidad genealógica
        await TraceabilityEvent.create({
          qr_code_id: qrRecord.id,
          event_type: 'SPLIT_CONTAINER',
          entity_type: 'PROCESS_PREPARATION',
          entity_id: prep ? prep.id.toString() : '500KG-BATCH',
          performed_by: userId || 1,
          notes: notes || `Sub-contenedor ${containerNum}/${containers.length} generado con ${containerWeight} kg de mezcla (Total lote padre: ${parentTotalWeight} kg).`,
          metadata: {
            parent_mixture_qr,
            container_number: containerNum,
            container_weight_kg: containerWeight,
            total_parent_weight_kg: parentTotalWeight,
            split_at: now
          }
        }, { transaction: t });

        splitResults.push({
          container_number: containerNum,
          qr_code: childQr,
          container_weight_kg: containerWeight,
          total_batch_weight_kg: parentTotalWeight,
          parent_mixture_qr
        });
      }

      return {
        message: `Mezcla ${parent_mixture_qr} dividida exitosamente en ${containers.length} sub-contenedores con QR identificador y trazabilidad completa.`,
        parent_mixture_qr,
        total_batch_weight_kg: parentTotalWeight,
        containers: splitResults
      };
    });
  }

  /**
   * Puntos 2 y 2.1: Registro de cambio espontáneo de fórmula/mezcla en extrusora.
   * Registra merma de transición y bobinas salientes del lote anterior y nuevo.
   */
  async recordMixtureTransition({
    extruder_id,
    from_mixture_qr,
    to_mixture_qr,
    transition_scrap_kg,
    scrap_items = [],
    last_pti_quantity = 0,
    first_pti_quantity = 0,
    reason = 'CAMBIO_DE_FORMULA',
    notes,
    userId
  }) {
    const { ExtruderQueue } = require('../../database/models');
    const machineId = Number(extruder_id);
    const [previousQueue, nextQueue] = await Promise.all([
      ExtruderQueue.findOne({ where: { extruder_id: machineId, consumption_order_qr_id: from_mixture_qr } }),
      ExtruderQueue.findOne({ where: { extruder_id: machineId, consumption_order_qr_id: to_mixture_qr } }),
    ]);
    if (!previousQueue || !nextQueue) {
      const error = new Error('Los QR de mezcla anterior y nueva deben pertenecer a la cola de la extrusora indicada.');
      error.statusCode = 404;
      throw error;
    }
    if (previousQueue.status !== 'ACTIVA') {
      const error = new Error('La mezcla anterior no está activa; no se puede registrar esta transición.');
      error.statusCode = 409;
      throw error;
    }
    if (!Array.isArray(scrap_items) || scrap_items.length === 0) {
      throw Object.assign(new Error('La transición requiere sus componentes de merma clasificados y, para mezcla combinada, su proporción estimada.'), { statusCode: 400 });
    }
    const transitionItems = scrap_items.map((item) => ({
      ...item,
      estimated_weight_kg: item.estimated_weight_kg ?? (scrap_items.length === 1 ? transition_scrap_kg : undefined),
    }));
    const result = await this.switchQueuePriority({
      extruder_id: machineId,
      target_queue_id: nextQueue.id,
      scrap_items: transitionItems,
      notes: notes || `${reason}. Bobinas lote previo: ${last_pti_quantity}; bobinas lote nuevo: ${first_pti_quantity}.`,
      userId,
    });
    return {
      ...result,
      message: `Transición de mezcla registrada en Extrusora ${machineId}.`,
      from_mixture_qr,
      to_mixture_qr,
      last_pti_quantity: Number(last_pti_quantity),
      first_pti_quantity: Number(first_pti_quantity),
    };
  }

  /**
   * Puntos 3 y 3.2: Calcula la valorización total del proceso de producción en Extrusión.
   * Incluye mezclas en cola, mezclas activas (en proceso) y PTI generado en racks.
   */
  async getExtrusionValuation({ cost_index = 1.15 } = {}) {
    const { ExtruderQueue, Formula, FormulaIngredient, Material, PtiRack, PtiProduct, Lote, ProcessPreparation, Silo } = require('../../database/models');
    const factor = Number(cost_index) || 1.15;
    const consumptionService = require('./services/consumption.service');

    const queues = await ExtruderQueue.findAll({
      where: { status: ['EN_ESPERA', 'ACTIVA'] },
      include: [{
        model: Formula,
        as: 'formula',
        include: [{
          model: FormulaIngredient,
          as: 'ingredients',
          include: [{ model: Material, as: 'material' }]
        }]
      }, { model: ProcessPreparation, as: 'preparation', required: false }]
    });

    const estimateFormulaCost = async (formula) => {
      if (!formula || !formula.ingredients?.length) return null;
      let rawCost = 0;
      for (const ing of formula.ingredients) {
        // Aun en registros heredados, el contenedor representa mezcla completa:
        // el PP del silo ya se incorporó en el mezclador y su costo cuenta aquí.
        const qty = Number(ing.quantity || 0);
        const lastLote = await Lote.findOne({
          where: { material_id: ing.material_id },
          order: [['created_at', 'DESC']]
        });
        const unitCost = lastLote && Number(lastLote.unit_cost) > 0 ? Number(lastLote.unit_cost) : null;
        if (unitCost == null) return null;
        rawCost += qty * unitCost;
      }
      return Number((rawCost * factor).toFixed(2));
    };

    let queuedValue = 0;
    let activeValue = 0;
    const queuedItems = [];
    const activeItems = [];
    const seenPreparations = new Set();
    let pendingMixValuations = 0;

    for (const q of queues) {
      const isSilo = Boolean(q.is_silo_kit);
      let val = null;
      if (q.preparation) {
        if (seenPreparations.has(q.preparation.id)) continue;
        seenPreparations.add(q.preparation.id);
        const remainingKg = Number(q.preparation.remaining_quantity_kg || 0);
        const transformedCostPerKg = q.preparation.transformed_cost_per_kg == null
          ? null
          : Number(q.preparation.transformed_cost_per_kg);
        val = transformedCostPerKg == null ? null : Number((remainingKg * transformedCostPerKg).toFixed(2));
      } else {
        val = await estimateFormulaCost(q.formula);
      }
      if (val == null) pendingMixValuations += 1;
      if (q.status === 'EN_ESPERA') {
        if (val != null) queuedValue += val;
        queuedItems.push({ id: q.id, extruder_id: q.extruder_id, qr: q.consumption_order_qr_id, value: val, valuation_pending: val == null, is_silo_kit: isSilo });
      } else if (q.status === 'ACTIVA') {
        if (val != null) activeValue += val;
        activeItems.push({ id: q.id, extruder_id: q.extruder_id, qr: q.consumption_order_qr_id, value: val, valuation_pending: val == null, is_silo_kit: isSilo });
      }
    }

    const racks = await PtiRack.findAll({
      include: [
        { model: Material, as: 'currentPtiType' },
        { model: PtiProduct, as: 'currentPtiProduct' },
      ]
    });

    let ptiRacksValue = 0;
    const racksData = racks.map(r => {
      const qty = Number(r.current_quantity || 0);
      const unitPrice = Number(r.unit_price || r.currentPtiProduct?.unit_price || 0);
      const unitWeight = Number(r.unit_weight_kg || r.currentPtiProduct?.unit_weight_kg || 0);
      const unitCostPerKg = Number(r.unit_cost_per_kg || 0);
      const hasTransformedCost = unitCostPerKg > 0 && unitWeight > 0;
      const totalVal = Number((hasTransformedCost ? qty * unitWeight * unitCostPerKg : qty * unitPrice).toFixed(2));
      ptiRacksValue += totalVal;
      return {
        id: r.id,
        rack_code: r.rack_code,
        current_quantity: qty,
        unit_price: unitPrice,
        unit_weight_kg: unitWeight > 0 ? unitWeight : null,
        unit_cost_per_kg: unitCostPerKg > 0 ? unitCostPerKg : null,
        total_value: totalVal,
        valuation_source: hasTransformedCost ? 'COSTO_TRANSFORMADO' : (unitPrice > 0 ? 'PRECIO_UNITARIO_HISTORICO' : 'SIN_VALOR_CONFIGURADO'),
        pti_type: r.currentPtiType?.name || 'Libre'
      };
    });

    // Auditoría de Silos
    const silos = await Silo.findAll({ where: { is_active: true } });
    let totalSilosStockKg = 0;
    let totalSilosValue = 0;
    const silosData = silos.map(s => {
      const stock = Number(s.current_stock_kg || 0);
      const val = Number((stock * Number(s.unit_cost || 28.5)).toFixed(2));
      totalSilosStockKg += stock;
      totalSilosValue += val;
      return {
        id: s.id,
        code: s.code,
        name: s.name,
        current_stock_kg: stock,
        current_lot_type: s.current_lot_type,
        current_lot_number: s.current_lot_number,
        unit_cost: Number(s.unit_cost),
        value: val
      };
    });

    const totalExtrusionWipValue = Number((queuedValue + activeValue + ptiRacksValue).toFixed(2));

    return {
      cost_index: factor,
      queued_mixes_value: Number(queuedValue.toFixed(2)),
      active_mixes_value: Number(activeValue.toFixed(2)),
      pti_racks_value: Number(ptiRacksValue.toFixed(2)),
      total_extrusion_wip_value: totalExtrusionWipValue,
      queued_items_count: queuedItems.length,
      active_items_count: activeItems.length,
      pending_mix_valuations_count: pendingMixValuations,
      racks_count: racks.length,
      racks: racksData,
      silos_valuation: {
        total_stock_kg: Number(totalSilosStockKg.toFixed(2)),
        total_value: Number(totalSilosValue.toFixed(2)),
        silos: silosData
      }
    };
  }

  /**
   * Calcula el costo de materiales, valor transformado con cost_index y precio sugerido por PTI.
   * Regla de Oro #2 y #6: El backend calcula todos los montos e indicadores; el frontend solo visualiza.
   */
  async calculateFormulaCosts(formula) {
    const { Lote } = require('../../database/models');
    let rawMaterialsCost = 0;
    let hasCompleteLotCosts = true;
    const plain = formula.toJSON ? formula.toJSON() : formula;

    if (plain.ingredients && Array.isArray(plain.ingredients)) {
      for (const ing of plain.ingredients) {
        const qty = Number(ing.quantity || 0);
        const lastLote = await Lote.findOne({
          where: { material_id: ing.material_id },
          order: [['created_at', 'DESC']]
        });
        const unitCost = lastLote && Number(lastLote.unit_cost) > 0 ? Number(lastLote.unit_cost) : null;
        if (unitCost == null) {
          hasCompleteLotCosts = false;
          continue;
        }
        rawMaterialsCost += qty * unitCost;
      }
    } else {
      hasCompleteLotCosts = false;
    }

    const costIndex = Number(plain.cost_index) > 0 ? Number(plain.cost_index) : null;
    const completeRawCost = hasCompleteLotCosts ? Number(rawMaterialsCost.toFixed(2)) : null;
    const transformedMixtureValue = completeRawCost == null || costIndex == null
      ? null
      : Number((completeRawCost * costIndex).toFixed(2));
    const expectedPieces = Number(plain.expected_yield_pieces) || 0;
    const suggestedPtiUnitPrice = transformedMixtureValue != null && expectedPieces > 0
      ? Number((transformedMixtureValue / expectedPieces).toFixed(2))
      : null;

    return {
      ...plain,
      cost_index: costIndex,
      raw_materials_cost: completeRawCost,
      transformed_mixture_value: transformedMixtureValue,
      suggested_pti_unit_price: suggestedPtiUnitPrice
    };
  }

  /**
   * Obtiene las fórmulas de extrusión con ingredientes, catálogo de PTIs asociados
   * y valor transformado calculado con su índice de multiplicación.
   */
  async getExtrusionFormulas(query = {}) {
    const { Formula, FormulaIngredient, Material, PtiProduct } = require('../../database/models');
    const where = {};
    if (query.is_active !== 'ALL' && query.is_active !== undefined) {
      where.is_active = query.is_active === 'true' || query.is_active === true;
    } else if (query.is_active === undefined) {
      where.is_active = true;
    }

    const formulas = await Formula.findAll({
      where,
      include: [
        {
          model: FormulaIngredient,
          as: 'ingredients',
          include: [{ model: Material, as: 'material' }]
        },
        {
          model: PtiProduct,
          as: 'ptiProducts'
        }
      ],
      order: [['name', 'ASC']]
    });

    const enriched = [];
    for (const f of formulas) {
      enriched.push(await this.calculateFormulaCosts(f));
    }
    return enriched;
  }

  /**
   * Registra merma / scrap operativo directamente para una extrusora o mezcla.
   * Regla de Oro: El backend calcula el balance y almacena el pesaje con trazabilidad.
   */
  async registerOperationalScrap({
    extruder_id,
    mixture_qr_id,
    scrap_weight_kg,
    estimated_weight_kg,
    actual_weight_kg,
    reason = 'DESPERDICIO_OPERATIVO',
    category = 'OPERATIVA',
    color,
    shift_code,
    source_material_id,
    source_lote_id,
    notes,
    userId,
  }) {
    const measured = actual_weight_kg == null ? (estimated_weight_kg == null ? scrap_weight_kg : null) : actual_weight_kg;
    const estimate = estimated_weight_kg == null ? (scrap_weight_kg == null ? null : scrap_weight_kg) : estimated_weight_kg;
    const effectiveWeight = Number(measured ?? estimate);
    if (!Number.isFinite(effectiveWeight) || effectiveWeight <= 0) {
      const error = new Error('Captura un peso estimado o real mayor a 0 kg.');
      error.statusCode = 400;
      throw error;
    }

    const { Extruder, ExtrusionScrapLog, ExtruderQueue, ProcessPreparation, Lote } = require('../../database/models');
    const machineId = Number(extruder_id);
    const log = await sequelize.transaction(async (transaction) => {
      const machine = await Extruder.findByPk(machineId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!machine || !machine.is_active) {
        const error = new Error(`Máquina ID ${machineId} no válida o inactiva.`);
        error.statusCode = 400;
        throw error;
      }

      let mixQr = category === 'MATERIAL_PURGA' ? null : mixture_qr_id;
      if (!mixQr && category !== 'MATERIAL_PURGA') {
        const active = await ExtruderQueue.findOne({ where: { extruder_id: machineId, status: 'ACTIVA' }, transaction, lock: transaction.LOCK.UPDATE });
        mixQr = active?.consumption_order_qr_id;
      }
      if (!mixQr && category !== 'MATERIAL_PURGA') {
        const error = new Error('Indica la mezcla de origen del scrap o selecciona una mezcla activa.');
        error.statusCode = 400;
        throw error;
      }

      const queue = mixQr && category !== 'MATERIAL_PURGA' && await ExtruderQueue.findOne({ where: { extruder_id: machineId, consumption_order_qr_id: mixQr }, transaction });
      const prep = queue?.process_preparation_id
        ? await ProcessPreparation.findByPk(queue.process_preparation_id, { transaction, lock: transaction.LOCK.UPDATE })
        : null;
      const containerTraceable = queue ? await this.getPreparedMixTraceableItem(mixQr, transaction, true) : null;
      if (prep?.remaining_quantity_kg != null && Number(prep.remaining_quantity_kg) < effectiveWeight) {
        const error = new Error(`La merma excede el saldo de mezcla disponible (${Number(prep.remaining_quantity_kg).toFixed(3)} kg).`);
        error.statusCode = 409;
        throw error;
      }
      if (containerTraceable && Number(containerTraceable.quantity_current) + 0.001 < effectiveWeight) {
        throw Object.assign(new Error(`La merma excede el saldo del contenedor ${mixQr} (${Number(containerTraceable.quantity_current).toFixed(3)} kg).`), { statusCode: 409 });
      }

      let unitCost = null;
      let costStatus = 'PENDIENTE_COSTO';
      let purgeLote = null;
      if (category === 'MATERIAL_PURGA') {
        if (!source_lote_id || !source_material_id) throw Object.assign(new Error('La purga requiere material y lote de origen.'), { statusCode: 400 });
        purgeLote = await Lote.findOne({
          where: { id: source_lote_id, material_id: source_material_id, is_active: true, is_frozen: false },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (!purgeLote) throw Object.assign(new Error('El lote de purga no existe, está inactivo o pertenece a otro material.'), { statusCode: 409 });
        if (purgeLote.unit_cost != null && Number(purgeLote.unit_cost) >= 0) {
          unitCost = Number(purgeLote.unit_cost);
          costStatus = measured == null ? 'PENDIENTE_PESAJE' : 'VALUADO';
        }
      } else if (prep?.transformed_cost_per_kg != null) {
        unitCost = Number(prep.transformed_cost_per_kg);
        costStatus = measured == null ? 'PENDIENTE_PESAJE' : 'VALUADO';
      }

      const scrapLog = await ExtrusionScrapLog.create({
        extruder_id: machineId,
        from_mixture_qr_id: mixQr || 'MATERIAL_PURGA',
        to_mixture_qr_id: null,
        scrap_weight_kg: effectiveWeight,
        estimated_weight_kg: estimate == null ? null : Number(estimate),
        actual_weight_kg: measured == null ? null : Number(measured),
        reason,
        category,
        color: color || null,
        shift_code: shift_code || 'TURNO_1',
        source_material_id: source_material_id || null,
        source_lote_id: source_lote_id || null,
        actual_weight_method: measured == null ? 'ESTIMADO_POR_EVENTO' : 'PESAJE_DIRECTO',
        valuation_unit_cost: unitCost,
        valuation_total_cost: unitCost == null ? null : Number((effectiveWeight * unitCost).toFixed(4)),
        valuation_status: costStatus,
        mixture_consumption_applied: Boolean(prep || containerTraceable),
        weighed_by: measured == null ? null : (userId || null),
        weighed_at: measured == null ? null : new Date(),
        notes: notes || null,
        logged_by: userId || null,
      }, { transaction });

      if (prep) {
        prep.remaining_quantity_kg = Math.max(0, Number((Number(prep.remaining_quantity_kg) - effectiveWeight).toFixed(3)));
        await prep.save({ transaction });
      }
      if (containerTraceable) {
        containerTraceable.quantity_current = Math.max(0, Number((Number(containerTraceable.quantity_current) - effectiveWeight).toFixed(3)));
        containerTraceable.status = containerTraceable.quantity_current <= 0.001 ? 'CONSUMIDO' : 'EN_PROCESO';
        containerTraceable.updated_by = userId || null;
        await containerTraceable.save({ transaction });
      }
      if (category === 'MATERIAL_PURGA') {
        await this.reconcilePurgeMaterialStock({
          loteId: purgeLote.id,
          quantityDelta: effectiveWeight,
          userId,
          transaction,
          reason: `Merma de purga extrusión (${scrapLog.id})`,
        });
      }
      const queueCompletion = await this.completeQueueIfDepleted(queue, prep, containerTraceable, transaction);
      return { scrap_log: scrapLog, queue_completion: queueCompletion };
    });

    const balance = log.scrap_log.from_mixture_qr_id === 'MATERIAL_PURGA' ? null : await this.getMassBalance(log.scrap_log.from_mixture_qr_id);
    return {
      message: `Merma de ${effectiveWeight} kg registrada correctamente.`,
      scrap_log: log.scrap_log,
      mass_balance: balance,
      queue_completion: log.queue_completion,
    };
  }

  async adjustScrapWeight({ scrap_log_id, actual_weight_kg, correction_reason, userId }) {
    const actual = Number(actual_weight_kg);
    if (!Number.isFinite(actual) || actual <= 0 || !correction_reason?.trim()) {
      const error = new Error('El peso real debe ser mayor a cero y requiere motivo de ajuste.');
      error.statusCode = 400;
      throw error;
    }
    const { ExtrusionScrapLog, ExtrusionScrapAdjustment, ExtruderQueue, ProcessPreparation, Lote } = require('../../database/models');
    const log = await sequelize.transaction(async (transaction) => {
      const scrap = await ExtrusionScrapLog.findByPk(scrap_log_id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!scrap) {
        const error = new Error('Registro de scrap no encontrado.');
        error.statusCode = 404;
        throw error;
      }
      const previous = Number(scrap.actual_weight_kg ?? scrap.estimated_weight_kg ?? scrap.scrap_weight_kg);
      await ExtrusionScrapAdjustment.create({
        scrap_log_id: scrap.id,
        previous_weight_kg: previous,
        corrected_weight_kg: actual,
        correction_reason: correction_reason.trim(),
        corrected_by: userId || null,
      }, { transaction });

      const oldDebits = scrap.mixture_consumption_applied
        ? await this.getScrapMixtureDebits(scrap, previous, transaction)
        : [];
      const newDebits = await this.getScrapMixtureDebits(scrap, actual, transaction);
      await this.applyPreparationDebitDelta(oldDebits, newDebits, transaction);
      if (scrap.category === 'MATERIAL_PURGA' && scrap.source_lote_id) {
        await this.reconcilePurgeMaterialStock({
          loteId: scrap.source_lote_id,
          quantityDelta: actual - previous,
          userId,
          transaction,
          reason: `Ajuste de pesaje de purga (${scrap.id})`,
        });
      }

      scrap.actual_weight_kg = actual;
      scrap.scrap_weight_kg = actual;
      scrap.weighed_by = userId || null;
      scrap.weighed_at = new Date();
      scrap.mixture_consumption_applied = newDebits.length > 0;
      scrap.valuation_status = 'PENDIENTE_COSTO';
      await this.valueScrapLog(scrap, transaction, actual);
      await scrap.save({ transaction });
      return scrap;
    });
    const balance = log.from_mixture_qr_id === 'MATERIAL_PURGA' ? null : await this.getMassBalance(log.from_mixture_qr_id);
    return { scrap_log: log, mass_balance: balance };
  }

  async getScrapMixtureDebits(scrap, weightKg, transaction) {
    if (scrap.category === 'MATERIAL_PURGA') return [];
    const { ExtruderQueue } = require('../../database/models');
    const fromQueue = await ExtruderQueue.findOne({ where: { consumption_order_qr_id: scrap.from_mixture_qr_id }, transaction });
    const toQueue = scrap.to_mixture_qr_id
      ? await ExtruderQueue.findOne({ where: { consumption_order_qr_id: scrap.to_mixture_qr_id }, transaction })
      : null;
    const hasTransition = Boolean(toQueue);
    if (!hasTransition) return fromQueue ? [{ preparationId: fromQueue.process_preparation_id, mixtureQr: fromQueue.consumption_order_qr_id, quantity: Number(weightKg) }] : [];

    let fromShare = scrap.from_mix_share == null ? null : Number(scrap.from_mix_share);
    let toShare = scrap.to_mix_share == null ? null : Number(scrap.to_mix_share);
    if (scrap.category === 'MEZCLA_ANTERIOR') { fromShare = 100; toShare = 0; }
    if (scrap.category === 'MEZCLA_NUEVA') { fromShare = 0; toShare = 100; }
    if (fromShare == null || toShare == null || Math.abs(fromShare + toShare - 100) > 0.01) return [];
    return [
      { preparationId: fromQueue?.process_preparation_id, mixtureQr: fromQueue?.consumption_order_qr_id, quantity: Number((weightKg * fromShare / 100).toFixed(3)) },
      { preparationId: toQueue?.process_preparation_id, mixtureQr: toQueue?.consumption_order_qr_id, quantity: Number((weightKg * toShare / 100).toFixed(3)) },
    ].filter((item) => item.mixtureQr && item.quantity > 0);
  }

  async applyPreparationDebitDelta(previousDebits, nextDebits, transaction) {
    const deltaByPreparation = new Map();
    const deltaByQr = new Map();
    for (const debit of previousDebits) {
      if (debit.preparationId) deltaByPreparation.set(debit.preparationId, (deltaByPreparation.get(debit.preparationId) || 0) + debit.quantity);
      if (debit.mixtureQr) deltaByQr.set(debit.mixtureQr, (deltaByQr.get(debit.mixtureQr) || 0) + debit.quantity);
    }
    for (const debit of nextDebits) {
      if (debit.preparationId) deltaByPreparation.set(debit.preparationId, (deltaByPreparation.get(debit.preparationId) || 0) - debit.quantity);
      if (debit.mixtureQr) deltaByQr.set(debit.mixtureQr, (deltaByQr.get(debit.mixtureQr) || 0) - debit.quantity);
    }
    const { ProcessPreparation } = require('../../database/models');
    for (const [preparationId, addBackKg] of deltaByPreparation) {
      const prep = await ProcessPreparation.findByPk(preparationId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!prep || prep.remaining_quantity_kg == null) continue;
      const nextBalance = Number((Number(prep.remaining_quantity_kg) + addBackKg).toFixed(3));
      // Keep the ledger non-negative; any measured overrun remains visible as a mass-balance variance.
      prep.remaining_quantity_kg = Math.max(0, nextBalance);
      await prep.save({ transaction });
    }
    for (const [mixtureQr, deltaKg] of deltaByQr) {
      const traceable = await this.getPreparedMixTraceableItem(mixtureQr, transaction, true);
      if (!traceable) continue;
      const nextBalance = Number((Number(traceable.quantity_current) + deltaKg).toFixed(3));
      traceable.quantity_current = Math.max(0, nextBalance);
      traceable.status = traceable.quantity_current <= 0.001 ? 'CONSUMIDO' : 'EN_PROCESO';
      await traceable.save({ transaction });
    }
  }

  async valueScrapLog(scrap, transaction, weightKg) {
    const { ExtruderQueue, ProcessPreparation, Lote } = require('../../database/models');
    let unitCost = null;
    if (scrap.category === 'MATERIAL_PURGA') {
      const lote = scrap.source_lote_id ? await Lote.findByPk(scrap.source_lote_id, { transaction }) : null;
      if (lote && Number(lote.unit_cost) >= 0) unitCost = Number(lote.unit_cost);
    } else if (scrap.to_mixture_qr_id) {
      const debits = await this.getScrapMixtureDebits(scrap, 100, transaction);
      if (debits.length) {
        const queueIds = [scrap.from_mixture_qr_id, scrap.to_mixture_qr_id];
        const queues = await ExtruderQueue.findAll({ where: { consumption_order_qr_id: queueIds }, transaction });
        const prepIds = queues.map((queue) => queue.process_preparation_id).filter(Boolean);
        const preps = await ProcessPreparation.findAll({ where: { id: prepIds }, transaction });
        const fromShare = Number(scrap.from_mix_share);
        const toShare = Number(scrap.to_mix_share);
        const fromPrep = queues.find((queue) => queue.consumption_order_qr_id === scrap.from_mixture_qr_id)?.process_preparation_id;
        const toPrep = queues.find((queue) => queue.consumption_order_qr_id === scrap.to_mixture_qr_id)?.process_preparation_id;
        const fromCost = Number(preps.find((prep) => prep.id === fromPrep)?.transformed_cost_per_kg);
        const toCost = Number(preps.find((prep) => prep.id === toPrep)?.transformed_cost_per_kg);
        if (Number.isFinite(fromCost) && Number.isFinite(toCost) && Number.isFinite(fromShare) && Number.isFinite(toShare) && Math.abs(fromShare + toShare - 100) < 0.01) {
          unitCost = (fromCost * fromShare + toCost * toShare) / 100;
        } else if (scrap.category === 'MEZCLA_ANTERIOR' && Number.isFinite(fromCost)) unitCost = fromCost;
        else if (scrap.category === 'MEZCLA_NUEVA' && Number.isFinite(toCost)) unitCost = toCost;
      }
    } else {
      const queue = await ExtruderQueue.findOne({ where: { consumption_order_qr_id: scrap.from_mixture_qr_id }, transaction });
      const prep = queue?.process_preparation_id ? await ProcessPreparation.findByPk(queue.process_preparation_id, { transaction }) : null;
      if (prep?.transformed_cost_per_kg != null) unitCost = Number(prep.transformed_cost_per_kg);
    }
    scrap.valuation_unit_cost = unitCost;
    scrap.valuation_total_cost = unitCost == null ? null : Number((Number(weightKg) * unitCost).toFixed(4));
    scrap.valuation_status = unitCost == null ? 'PENDIENTE_COSTO' : 'VALUADO';
  }

  async closeExtrusionShift({ extruder_id, shift_date, shift_code, actual_scrap_weight_kg, actual_total_weight_kg, grouped_weighings, weighings, notes, userId }) {
    const bulkWeightInput = actual_scrap_weight_kg ?? actual_total_weight_kg;
    const bulkMode = bulkWeightInput !== undefined && bulkWeightInput !== null;
    const bulkWeight = bulkMode ? Number(bulkWeightInput) : null;
    const groupedMode = Array.isArray(grouped_weighings) && grouped_weighings.length > 0;
    if (!extruder_id || !shift_date || !shift_code || (bulkMode && groupedMode) || (!bulkMode && !groupedMode && !Array.isArray(weighings)) || (bulkMode && (!Number.isFinite(bulkWeight) || bulkWeight < 0))) {
      const error = new Error('Extrusora, fecha, turno y peso total real de merma (mayor o igual a cero) son obligatorios.');
      error.statusCode = 400;
      throw error;
    }
    if (groupedMode && grouped_weighings.some((item) => !item?.category || !Number.isFinite(Number(item.actual_weight_kg)) || Number(item.actual_weight_kg) < 0)) {
      throw Object.assign(new Error('Cada grupo de scrap requiere categoría y un peso real mayor o igual a cero.'), { statusCode: 400 });
    }
    const { Op } = require('sequelize');
    const { Extruder, ExtruderQueue, ExtrusionScrapLog, ExtrusionShiftClosure, ExtrusionTransition } = require('../../database/models');
    const machineId = Number(extruder_id);
    return sequelize.transaction(async (transaction) => {
      const machine = await Extruder.findByPk(machineId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!machine || !machine.is_active) throw Object.assign(new Error('Extrusora no encontrada o inactiva.'), { statusCode: 404 });
      // shift_date is entered in the plant's America/Mexico_City calendar.
      const start = new Date(`${shift_date}T06:00:00-06:00`);
      if (Number.isNaN(start.getTime())) throw Object.assign(new Error('Fecha de turno inválida.'), { statusCode: 400 });
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      const existingClosure = await ExtrusionShiftClosure.findOne({ where: { extruder_id: machineId, shift_date, shift_code }, transaction, lock: transaction.LOCK.UPDATE });
      if (existingClosure) throw Object.assign(new Error('Este turno ya fue conciliado y cerrado.'), { statusCode: 409 });
      const logs = await ExtrusionScrapLog.findAll({
        where: { extruder_id: machineId, shift_code, created_at: { [Op.gte]: start, [Op.lt]: end } },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (logs.some((log) => log.shift_closure_id)) throw Object.assign(new Error('Este turno ya tiene una conciliación cerrada.'), { statusCode: 409 });
      let weighingById = new Map();
      if (bulkMode) {
        const estimate = (log) => Math.max(0, Number(log.estimated_weight_kg ?? log.actual_weight_kg ?? log.scrap_weight_kg) || 0);
        const estimateTotal = logs.reduce((sum, log) => sum + estimate(log), 0);
        let allocated = 0;
        logs.forEach((log, index) => {
          const amount = index === logs.length - 1
            ? Number((bulkWeight - allocated).toFixed(3))
            : estimateTotal > 0 ? Math.floor((bulkWeight * estimate(log) / estimateTotal) * 1000) / 1000 : 0;
          allocated += amount;
          weighingById.set(Number(log.id), { actual_weight_kg: amount, correction_reason: 'Conciliación proporcional del pesaje agregado por extrusora y turno' });
        });
        if (!logs.length && bulkWeight > 0) {
          const { ExtrusionScrapLog: ScrapLog } = require('../../database/models');
          const unassigned = await ScrapLog.create({
            extruder_id: machineId, from_mixture_qr_id: 'MERMA_NO_ATRIBUIDA', to_mixture_qr_id: null,
            scrap_weight_kg: bulkWeight, estimated_weight_kg: 0, actual_weight_kg: bulkWeight,
            reason: 'MERMA_NO_ATRIBUIDA', category: 'MERMA_NO_ATRIBUIDA', shift_code,
            actual_weight_method: 'PESAJE_AGREGADO_NO_ATRIBUIDO', mixture_consumption_applied: false,
            valuation_status: 'PENDIENTE_COSTO', weighed_by: userId || null, weighed_at: new Date(), logged_by: userId || null,
            notes: 'Peso total de cierre sin eventos estimados asociados; requiere clasificación posterior.',
          }, { transaction });
          logs.push(unassigned);
          weighingById.set(Number(unassigned.id), { actual_weight_kg: bulkWeight });
        }
      } else if (groupedMode) {
        const getGroupKey = (item) => JSON.stringify([
          String(item.category || 'SIN_CATEGORIA').trim().toUpperCase(),
          String(item.color || '').trim().toUpperCase(),
          String(item.category).trim().toUpperCase() === 'MATERIAL_PURGA' ? (Number(item.source_lote_id) || null) : null,
        ]);
        const groupedLogs = new Map();
        for (const log of logs) {
          const key = getGroupKey(log);
          if (!groupedLogs.has(key)) groupedLogs.set(key, []);
          groupedLogs.get(key).push(log);
        }
        const submittedGroups = new Map();
        for (const item of grouped_weighings) {
          const key = getGroupKey(item);
          if (submittedGroups.has(key)) throw Object.assign(new Error('Hay grupos de pesaje duplicados; combina sus pesos antes de cerrar.'), { statusCode: 400 });
          submittedGroups.set(key, item);
        }
        if (submittedGroups.size !== groupedLogs.size || [...groupedLogs.keys()].some((key) => !submittedGroups.has(key))) {
          throw Object.assign(new Error('El pesaje debe incluir exactamente los grupos de scrap registrados, separados por categoría y color.'), { statusCode: 400 });
        }
        for (const [key, groupLogs] of groupedLogs) {
          const actualGroupWeight = Number(submittedGroups.get(key).actual_weight_kg);
          const estimate = (log) => Math.max(0, Number(log.estimated_weight_kg ?? log.actual_weight_kg ?? log.scrap_weight_kg) || 0);
          const estimateTotal = groupLogs.reduce((sum, log) => sum + estimate(log), 0);
          let allocated = 0;
          groupLogs.forEach((log, index) => {
            const amount = index === groupLogs.length - 1
              ? Number((actualGroupWeight - allocated).toFixed(3))
              : estimateTotal > 0
                ? Math.floor((actualGroupWeight * estimate(log) / estimateTotal) * 1000) / 1000
                : Number((actualGroupWeight / groupLogs.length).toFixed(3));
            allocated += amount;
            weighingById.set(Number(log.id), { actual_weight_kg: amount, correction_reason: 'Conciliación del pesaje agregado por categoría y color' });
          });
        }
      } else {
        weighingById = new Map(weighings.map((item) => [Number(item.scrap_log_id), item]));
        const missingWeights = logs.filter((log) => !Number.isFinite(Number(weighingById.get(log.id)?.actual_weight_kg)) || Number(weighingById.get(log.id)?.actual_weight_kg) <= 0);
        if (missingWeights.length) throw Object.assign(new Error(`Falta el pesaje real de ${missingWeights.length} registro(s) de scrap del turno.`), { statusCode: 400 });
      }

      let estimatedTotal = 0;
      let actualTotal = 0;
      let estimatedCost = 0;
      let actualCost = 0;
      for (const scrap of logs) {
        const entry = weighingById.get(scrap.id);
        const previousWeight = Number(scrap.estimated_weight_kg ?? scrap.actual_weight_kg ?? scrap.scrap_weight_kg);
        const actualWeight = Number(entry.actual_weight_kg);
        if (entry.correction_reason?.trim() && Math.abs(previousWeight - actualWeight) > 0.0005) {
          const { ExtrusionScrapAdjustment } = require('../../database/models');
          await ExtrusionScrapAdjustment.create({
            scrap_log_id: scrap.id,
            previous_weight_kg: previousWeight,
            corrected_weight_kg: actualWeight,
            correction_reason: entry.correction_reason.trim(),
            corrected_by: userId || null,
          }, { transaction });
        }
        const oldDebits = scrap.mixture_consumption_applied
          ? await this.getScrapMixtureDebits(scrap, previousWeight, transaction)
          : [];
        const newDebits = await this.getScrapMixtureDebits(scrap, actualWeight, transaction);
        await this.applyPreparationDebitDelta(oldDebits, newDebits, transaction);
        if (scrap.category === 'MATERIAL_PURGA' && scrap.source_lote_id) {
          await this.reconcilePurgeMaterialStock({
            loteId: scrap.source_lote_id,
            quantityDelta: actualWeight - previousWeight,
            userId,
            transaction,
            reason: `Conciliación de pesaje de purga (${scrap.id})`,
          });
        }

        scrap.actual_weight_kg = actualWeight;
        scrap.scrap_weight_kg = actualWeight;
        scrap.weighed_by = userId || null;
        scrap.weighed_at = new Date();
        scrap.actual_weight_method = bulkMode ? (scrap.category === 'MERMA_NO_ATRIBUIDA' ? 'PESAJE_AGREGADO_NO_ATRIBUIDO' : 'PESAJE_AGREGADO_PROPORCIONAL') : 'PESAJE_DIRECTO';
        scrap.mixture_consumption_applied = scrap.mixture_consumption_applied || newDebits.length > 0;
        await this.valueScrapLog(scrap, transaction, actualWeight);
        await scrap.save({ transaction });

        estimatedTotal += Number(scrap.estimated_weight_kg ?? previousWeight);
        actualTotal += actualWeight;
        estimatedCost += Number(scrap.valuation_unit_cost || 0) * Number(scrap.estimated_weight_kg ?? previousWeight);
        actualCost += Number(scrap.valuation_total_cost || 0);
      }

      const closure = await ExtrusionShiftClosure.create({
        extruder_id: machineId,
        shift_date,
        shift_code,
        status: 'CERRADO',
        estimated_scrap_kg: Number(estimatedTotal.toFixed(3)),
        actual_scrap_kg: Number(actualTotal.toFixed(3)),
        variance_kg: Number((actualTotal - estimatedTotal).toFixed(3)),
        estimated_scrap_cost: Number(estimatedCost.toFixed(4)),
        actual_scrap_cost: Number(actualCost.toFixed(4)),
        variance_cost: Number((actualCost - estimatedCost).toFixed(4)),
        closed_by: userId || null,
        closed_at: new Date(),
        notes: notes || null,
      }, { transaction });

      if (logs.length) await ExtrusionScrapLog.update({ shift_closure_id: closure.id }, { where: { id: logs.map((log) => log.id) }, transaction });

      const transitionIds = [...new Set(logs.map((log) => log.transition_id).filter(Boolean))];
      for (const transitionId of transitionIds) {
        const remaining = await ExtrusionScrapLog.count({
          where: { transition_id: transitionId, actual_weight_kg: null },
          transaction,
        });
        if (remaining === 0) {
          await ExtrusionTransition.update({ status: 'CERRADA', closed_at: new Date(), closed_by: userId || null }, { where: { id: transitionId }, transaction });
        }
      }
      const affectedQrs = [...new Set(logs.flatMap((log) => [log.from_mixture_qr_id, log.to_mixture_qr_id]).filter((qr) => qr && qr !== 'MATERIAL_PURGA' && qr !== 'MERMA_NO_ATRIBUIDA'))];
      for (const qr of affectedQrs) {
        const queue = await ExtruderQueue.findOne({ where: { consumption_order_qr_id: qr }, transaction, lock: transaction.LOCK.UPDATE });
        if (!queue) continue;
        const { ProcessPreparation } = require('../../database/models');
        const prep = queue.process_preparation_id ? await ProcessPreparation.findByPk(queue.process_preparation_id, { transaction, lock: transaction.LOCK.UPDATE }) : null;
        const tracked = await this.getPreparedMixTraceableItem(qr, transaction, true);
        await this.completeQueueIfDepleted(queue, prep, tracked, transaction);
      }
      return closure;
    });
  }

  async adjustProductionEntry({ production_entry_id, pieces, net_weight_kg, correction_reason, userId }) {
    const correctedPieces = Number(pieces);
    const correctedWeight = Number(net_weight_kg);
    if (!Number.isInteger(correctedPieces) || correctedPieces <= 0 || !Number.isFinite(correctedWeight) || correctedWeight <= 0 || !correction_reason?.trim()) {
      throw Object.assign(new Error('Piezas y peso deben ser mayores a cero y el ajuste requiere motivo.'), { statusCode: 400 });
    }
    const { ExtrusionProductionEntry, ExtrusionProductionAdjustment, ProcessPreparation, ExtruderQueue } = require('../../database/models');
    return sequelize.transaction(async (transaction) => {
      const entry = await ExtrusionProductionEntry.findByPk(production_entry_id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!entry || entry.voided_at) throw Object.assign(new Error('Registro de producción inexistente o anulado.'), { statusCode: 404 });
      const previousPieces = Number(entry.pieces);
      const previousWeight = Number(entry.net_weight_kg);
      if (entry.process_preparation_id) {
        const prep = await ProcessPreparation.findByPk(entry.process_preparation_id, { transaction, lock: transaction.LOCK.UPDATE });
        if (prep?.remaining_quantity_kg != null) {
          const updatedRemaining = Number((Number(prep.remaining_quantity_kg) + previousWeight - correctedWeight).toFixed(3));
          prep.remaining_quantity_kg = Math.max(0, updatedRemaining);
          await prep.save({ transaction });
        }
      }
      const tracked = await this.getPreparedMixTraceableItem(entry.mixture_qr, transaction, true);
      if (tracked) {
        const correctedBalance = Number((Number(tracked.quantity_current) + previousWeight - correctedWeight).toFixed(3));
        tracked.quantity_current = Math.max(0, correctedBalance);
        tracked.status = tracked.quantity_current <= 0.001 ? 'CONSUMIDO' : 'EN_PROCESO';
        await tracked.save({ transaction });
      }
      await ExtrusionProductionAdjustment.create({
        production_entry_id: entry.id,
        previous_pieces: previousPieces,
        corrected_pieces: correctedPieces,
        previous_weight_kg: previousWeight,
        corrected_weight_kg: correctedWeight,
        correction_reason: correction_reason.trim(),
        corrected_by: userId || null,
      }, { transaction });
      entry.pieces = correctedPieces;
      entry.net_weight_kg = correctedWeight;
      const productionCostPerKg = entry.pti_transformed_cost_per_kg ?? entry.mixture_cost_per_kg;
      if (productionCostPerKg != null) entry.production_value = Number((correctedWeight * Number(productionCostPerKg)).toFixed(4));
      await entry.save({ transaction });
      const queue = entry.queue_id ? await ExtruderQueue.findByPk(entry.queue_id, { transaction, lock: transaction.LOCK.UPDATE }) : null;
      if (queue) {
        const prep = entry.process_preparation_id ? await ProcessPreparation.findByPk(entry.process_preparation_id, { transaction, lock: transaction.LOCK.UPDATE }) : null;
        if (queue.status === 'COMPLETADA' && Number(tracked?.quantity_current || 0) > 0.001) {
          queue.status = 'PAUSADA';
          await queue.save({ transaction });
        }
        await this.completeQueueIfDepleted(queue, prep, tracked, transaction);
      }
      return entry;
    });
  }

  async getExtrusionWip({ includeFinancials = false } = {}) {
    const { WipInventory, Material, Lote, QrCode, Area, ProcessPreparation, ProcessFormula } = require('../../database/models');
    const area = await Area.findOne({ where: { code: 'EXTRUSION' } });
    if (!area) return { area_id: null, total_kg: 0, items: [], mixtures: [] };
    const items = await WipInventory.findAll({
      where: { area_id: area.id },
      include: [
        { model: Material, as: 'material', attributes: ['id', 'name', 'internal_code'] },
        { model: Lote, as: 'lote', attributes: includeFinancials ? ['id', 'folio', 'unit_cost'] : ['id', 'folio'] },
        { model: QrCode, as: 'qr_code', attributes: ['id', 'qr_code', 'status'] },
      ],
      order: [['updated_at', 'DESC']],
    });
    const data = items.map((item) => ({
      id: item.id,
      material_id: item.material_id,
      material: item.material,
      lote_id: item.lote_id,
      lote: item.lote,
      qr_code: item.qr_code?.qr_code || null,
      amount_kg: Number(item.amount || 0),
      ...(includeFinancials ? {
        unit_cost: item.lote?.unit_cost == null ? null : Number(item.lote.unit_cost),
        value: item.lote?.unit_cost == null ? null : Number((Number(item.amount) * Number(item.lote.unit_cost)).toFixed(4)),
      } : {}),
      updated_at: item.updated_at,
    }));
    const preparations = await ProcessPreparation.findAll({
      where: { to_area_id: area.id },
      include: [{ model: ProcessFormula, as: 'formula', attributes: ['id', 'name'] }],
      order: [['prepared_at', 'DESC']],
    });
    const mixtures = preparations
      .map((prep) => ({
        id: prep.id,
        folio: prep.folio,
        formula: prep.formula?.name || null,
        status: prep.status,
        quantity_kg: Number(prep.total_quantity || 0),
        remaining_kg: Number(prep.remaining_quantity_kg ?? prep.total_quantity ?? 0),
        ...(includeFinancials ? {
          transformed_cost_per_kg: prep.transformed_cost_per_kg == null ? null : Number(prep.transformed_cost_per_kg),
          remaining_value: prep.transformed_cost_per_kg == null ? null : Number((Number(prep.remaining_quantity_kg ?? prep.total_quantity ?? 0) * Number(prep.transformed_cost_per_kg)).toFixed(4)),
        } : {}),
        prepared_at: prep.prepared_at,
      }))
      .filter((prep) => prep.remaining_kg > 0);
    return {
      area_id: area.id,
      total_kg: Number(data.reduce((sum, item) => sum + item.amount_kg, 0).toFixed(3)),
      items: data,
      mixtures,
      mixtures_total_kg: Number(mixtures.reduce((sum, item) => sum + item.remaining_kg, 0).toFixed(3)),
      ...(includeFinancials ? {
        mixtures_total_value: Number(mixtures.reduce((sum, item) => sum + Number(item.remaining_value || 0), 0).toFixed(4)),
      } : {}),
    };
  }

  /**
   * Calcula el Balance de Masa exacto de una mezcla en Extrusión.
   * Entrada (kg) = Producto Útil (kg) + Merma/Scrap (kg) + Diferencia no cuantificada.
   * Golden Rule #2 y #6: El frontend NUNCA calcula indicadores ni balances; el backend entrega el DTO.
   */
  async getMassBalance(mixture_qr_id) {
    const { Op } = require('sequelize');
    const { ExtrusionScrapLog, ProcessPreparation, ExtruderQueue, ExtrusionProductionEntry, Formula, QrCode, TraceableItem } = require('../../database/models');
    const baseQueue = await ExtruderQueue.findOne({
      where: { consumption_order_qr_id: mixture_qr_id },
      include: [{ model: Formula, as: 'formula' }],
    });
    const prep = baseQueue?.process_preparation_id
      ? await ProcessPreparation.findByPk(baseQueue.process_preparation_id)
      : await ProcessPreparation.findOne({ where: { folio: mixture_qr_id } });
    const qrRecord = await QrCode.findOne({ where: { qr_code: mixture_qr_id }, attributes: ['id'] });
    const container = qrRecord ? await TraceableItem.findOne({ where: { qr_code_id: qrRecord.id, item_type: 'PREPARED_MIX' } }) : null;
    const containerScoped = Boolean(container && baseQueue);
    const relatedQueues = prep
      ? await ExtruderQueue.findAll({ where: { process_preparation_id: prep.id } })
      : (baseQueue ? [baseQueue] : []);
    const relatedQrs = containerScoped ? [mixture_qr_id] : relatedQueues.map((queue) => queue.consumption_order_qr_id);
    if (!relatedQrs.includes(mixture_qr_id)) relatedQrs.push(mixture_qr_id);

    const initialBatchKg = Number(container?.quantity_initial || prep?.total_quantity || baseQueue?.formula?.batch_size_kg || 500);
    const formulaName = prep?.formula_snapshot?.name || baseQueue?.formula?.name || 'Fórmula Extrusión Estándar';
    const productionEntries = await ExtrusionProductionEntry.findAll({
      where: {
        voided_at: null,
        ...(containerScoped ? { queue_id: baseQueue.id } : prep ? { process_preparation_id: prep.id } : { mixture_qr: mixture_qr_id }),
      },
      order: [['recorded_at', 'ASC']],
    });
    const outputKg = productionEntries.reduce((sum, entry) => sum + Number(entry.net_weight_kg || 0), 0);
    const outputPieces = productionEntries.reduce((sum, entry) => sum + Number(entry.pieces || 0), 0);
    const scrapLogs = await ExtrusionScrapLog.findAll({
      where: {
        [Op.or]: [
          { from_mixture_qr_id: { [Op.in]: relatedQrs } },
          { to_mixture_qr_id: { [Op.in]: relatedQrs } },
        ],
      },
      order: [['created_at', 'DESC']],
    });
    const mixtureScrapLogs = scrapLogs.filter((log) => log.category !== 'MATERIAL_PURGA');
    const purgeMaterialLogs = scrapLogs.filter((log) => log.category === 'MATERIAL_PURGA');
    const estimatedScrapKg = mixtureScrapLogs.reduce((sum, log) => sum + Number(log.estimated_weight_kg ?? log.actual_weight_kg ?? log.scrap_weight_kg ?? 0), 0);
    const actualScrapKg = mixtureScrapLogs.reduce((sum, log) => sum + Number(log.actual_weight_kg ?? (log.estimated_weight_kg == null ? log.scrap_weight_kg : 0) ?? 0), 0);
    const hasPendingWeights = scrapLogs.some((log) => log.actual_weight_kg == null && log.estimated_weight_kg != null);
    const balanceScrapKg = hasPendingWeights ? estimatedScrapKg : actualScrapKg;
    const remainingKg = containerScoped
      ? Number(container.quantity_current)
      : prep?.remaining_quantity_kg == null
      ? Math.max(0, initialBatchKg - outputKg - balanceScrapKg)
      : Number(prep.remaining_quantity_kg);
    const varianceKg = Number((initialBatchKg - outputKg - balanceScrapKg - remainingKg).toFixed(3));
    const scrapPercentage = initialBatchKg > 0 ? Number(((balanceScrapKg / initialBatchKg) * 100).toFixed(2)) : 0;
    const transformedCostPerKg = prep?.transformed_cost_per_kg == null ? null : Number(prep.transformed_cost_per_kg);
    const scrapCost = mixtureScrapLogs.reduce((sum, log) => sum + Number(log.valuation_total_cost || 0), 0);
    const purgeMaterialScrapKg = purgeMaterialLogs.reduce((sum, log) => sum + Number(log.actual_weight_kg ?? log.estimated_weight_kg ?? log.scrap_weight_kg ?? 0), 0);
    const purgeMaterialScrapCost = purgeMaterialLogs.reduce((sum, log) => sum + Number(log.valuation_total_cost || 0), 0);
    const outputCost = transformedCostPerKg == null ? null : Number((outputKg * transformedCostPerKg).toFixed(4));
    const ptiOutputCost = productionEntries.some((entry) => entry.production_value != null)
      ? Number(productionEntries.reduce((sum, entry) => sum + Number(entry.production_value || 0), 0).toFixed(4))
      : null;
    const formulaBatchKg = Number(baseQueue?.formula?.batch_size_kg || initialBatchKg || 500);
    const batchScale = formulaBatchKg > 0 ? initialBatchKg / formulaBatchKg : 1;
    const expectedUsefulKg = Math.max(0, initialBatchKg - estimatedScrapKg);
    const expectedYieldPieces = baseQueue?.formula?.expected_yield_pieces == null
      ? null
      : Math.round(Number(baseQueue.formula.expected_yield_pieces) * batchScale);
    const expectedYieldKg = baseQueue?.formula?.expected_yield_kg == null
      ? expectedUsefulKg
      : Number((Number(baseQueue.formula.expected_yield_kg) * batchScale).toFixed(3));

    let status = 'DENTRO_DE_BALANCE';
    if (Math.abs(varianceKg) > Math.max(1, initialBatchKg * 0.01)) status = 'REVISAR_DIFERENCIA';
    if (hasPendingWeights) status = 'PENDIENTE_PESAJE';
    if (prep?.cost_valuation_status !== 'VALUADO' && prep) status = `${status}_COSTO_PENDIENTE`;
    return {
      mixture_qr: mixture_qr_id,
      related_mixture_qrs: relatedQrs,
      preparation_id: prep?.id || null,
      folio: prep?.folio || null,
      formula_name: formulaName,
      batch_size_kg: initialBatchKg,
      mixture_cost_per_kg: transformedCostPerKg,
      transformed_mixture_value: prep?.transformed_value_snapshot == null ? null : Number(prep.transformed_value_snapshot),
      good_output_kg: Number(outputKg.toFixed(3)),
      good_output_pieces: outputPieces,
      estimated_useful_kg: Number(expectedUsefulKg.toFixed(3)),
      estimated_yield_percentage: initialBatchKg > 0 ? Number(((expectedUsefulKg / initialBatchKg) * 100).toFixed(2)) : 0,
      expected_output_kg: expectedYieldKg,
      expected_output_pieces: expectedYieldPieces,
      output_piece_variance: expectedYieldPieces == null ? null : outputPieces - expectedYieldPieces,
      estimated_scrap_kg: Number(estimatedScrapKg.toFixed(3)),
      actual_scrap_kg: Number(actualScrapKg.toFixed(3)),
      total_scrap_kg: Number(balanceScrapKg.toFixed(3)),
      scrap_cost: Number(scrapCost.toFixed(4)),
      purge_material_scrap_kg: Number(purgeMaterialScrapKg.toFixed(3)),
      purge_material_scrap_cost: Number(purgeMaterialScrapCost.toFixed(4)),
      total_scrap_cost: Number((scrapCost + purgeMaterialScrapCost).toFixed(4)),
      good_output_cost: outputCost,
      pti_output_cost: ptiOutputCost,
      remaining_mixture_kg: Number(remainingKg.toFixed(3)),
      unexplained_variance_kg: varianceKg,
      scrap_percentage: scrapPercentage,
      scrap_status: status,
      scrap_by_category_and_color: scrapLogs.reduce((groups, log) => {
        const key = `${log.category || 'OPERATIVA'}|${log.color || 'SIN_COLOR'}`;
        groups[key] = Number(((groups[key] || 0) + Number(log.actual_weight_kg ?? log.estimated_weight_kg ?? log.scrap_weight_kg ?? 0)).toFixed(3));
        return groups;
      }, {}),
      scrap_records_count: scrapLogs.length,
      scrap_details: scrapLogs,
      production_entries: productionEntries,
      scrap_logs: scrapLogs,
    };
  }

  /**
   * Obtiene el historial de registros de merma/scrap en Extrusión.
   */
  async getScrapLogs(query = {}) {
    const { ExtrusionScrapLog, User } = require('../../database/models');
    const where = {};
    if (query.extruder_id) where.extruder_id = Number(query.extruder_id);
    if (query.mixture_qr) where.from_mixture_qr_id = query.mixture_qr;
    if (query.shift_code) where.shift_code = query.shift_code;
    if (query.pending_weighing === 'true') where.actual_weight_kg = null;
    if (query.shift_date) {
      const { Op } = require('sequelize');
      const start = new Date(`${query.shift_date}T06:00:00.000Z`);
      if (!Number.isNaN(start.getTime())) where.created_at = { [Op.gte]: start, [Op.lt]: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
    }

    return await ExtrusionScrapLog.findAll({
      where,
      include: [{ model: User, as: 'operator', attributes: ['id', 'username', 'first_name', 'last_name'] }],
      order: [['created_at', 'DESC']],
      limit: Math.min(Number(query.limit) || 50, 200)
    });
  }

  /**
   * Obtiene una fórmula de extrusión por ID con sus costos calculados y PTIs asociados.
   */
  async getFormulaDetailsById(id) {
    const { Formula, FormulaIngredient, Material, PtiProduct } = require('../../database/models');
    const formula = await Formula.findByPk(id, {
      include: [
        {
          model: FormulaIngredient,
          as: 'ingredients',
          include: [{ model: Material, as: 'material' }]
        },
        {
          model: PtiProduct,
          as: 'ptiProducts'
        }
      ]
    });
    if (!formula) {
      const error = new Error(`Fórmula de extrusión con ID ${id} no encontrada.`);
      error.statusCode = 404;
      throw error;
    }
    return await this.calculateFormulaCosts(formula);
  }

  /**
   * Edita una fórmula de extrusión existente (nombre, descripción, cost_index, ingredientes, etc.)
   * Permite ajustar materiales, cantidades, composición y el índice de multiplicación para dar el valor transformado a la mezcla.
   */
  async updateFormula(id, payload) {
    const { Formula, FormulaIngredient, Material, PtiProduct, sequelize } = require('../../database/models');
    const formula = await Formula.findByPk(id);
    if (!formula) {
      const error = new Error(`Fórmula con ID ${id} no encontrada.`);
      error.statusCode = 404;
      throw error;
    }

    const t = await sequelize.transaction();
    try {
      if (payload.name !== undefined) {
        if (!payload.name || !String(payload.name).trim()) {
          const error = new Error('El nombre de la fórmula no puede estar vacío.');
          error.statusCode = 400;
          throw error;
        }
        formula.name = String(payload.name).trim();
      }

      if (payload.description !== undefined) {
        formula.description = payload.description;
      }

      if (payload.cost_index !== undefined) {
        const idx = Number(payload.cost_index);
        if (isNaN(idx) || idx < 0) {
          const error = new Error('El índice de multiplicación (cost_index) debe ser un número mayor o igual a 0.');
          error.statusCode = 400;
          throw error;
        }
        formula.cost_index = idx;
      }

      if (payload.batch_size_kg !== undefined) {
        const bs = Number(payload.batch_size_kg);
        if (isNaN(bs) || bs <= 0) {
          const error = new Error('El tamaño de lote (batch_size_kg) debe ser mayor a 0.');
          error.statusCode = 400;
          throw error;
        }
        formula.batch_size_kg = bs;
      }

      if (payload.expected_yield_pieces !== undefined) {
        const pieces = Number(payload.expected_yield_pieces);
        if (isNaN(pieces) || pieces < 0) {
          const error = new Error('El rendimiento esperado en piezas debe ser mayor o igual a 0.');
          error.statusCode = 400;
          throw error;
        }
        formula.expected_yield_pieces = pieces;
      }

      if (payload.expected_yield_kg !== undefined) {
        formula.expected_yield_kg = Number(payload.expected_yield_kg);
      }

      if (payload.is_active !== undefined) {
        formula.is_active = Boolean(payload.is_active);
      }

      if (payload.output_pti_id !== undefined) {
        const ptiId = payload.output_pti_id === null || payload.output_pti_id === ''
          ? null
          : Number(payload.output_pti_id);
        if (ptiId !== null && (!Number.isInteger(ptiId) || ptiId <= 0)) {
          const error = new Error('El PTI seleccionado no es válido.');
          error.statusCode = 400;
          throw error;
        }

        const nextPti = ptiId === null ? null : await PtiProduct.findByPk(ptiId, {
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
        if (ptiId !== null && !nextPti) {
          const error = new Error('El PTI seleccionado no existe.');
          error.statusCode = 404;
          throw error;
        }
        if (nextPti && nextPti.formula_id && Number(nextPti.formula_id) !== Number(formula.id)) {
          const error = new Error(`El PTI '${nextPti.code}' ya está enlazado a otra fórmula.`);
          error.statusCode = 409;
          throw error;
        }

        const previouslyLinkedPtis = await PtiProduct.findAll({ where: { formula_id: formula.id }, transaction: t });
        for (const previousPti of previouslyLinkedPtis) {
          if (Number(previousPti.id) !== ptiId) await previousPti.update({ formula_id: null }, { transaction: t });
        }
        if (nextPti) {
          await PtiProduct.update(
            { formula_id: formula.id },
            { where: { id: nextPti.id }, transaction: t }
          );
        }
        formula.output_pti_id = ptiId;
      }

      if (payload.ingredients && Array.isArray(payload.ingredients)) {
        if (payload.ingredients.length === 0) {
          const error = new Error('La fórmula debe contener al menos un ingrediente.');
          error.statusCode = 400;
          throw error;
        }

        // Eliminar ingredientes previos de esta fórmula
        await FormulaIngredient.destroy({
          where: { formula_id: formula.id },
          transaction: t
        });

        const batchSize = Number(formula.batch_size_kg) || 500;
        let totalQuantity = 0;
        let hasMachine4Restriction = false;

        const newIngredients = [];
        for (const item of payload.ingredients) {
          const materialId = Number(item.material_id);
          if (!materialId) {
            const error = new Error('Cada ingrediente debe tener un material válido asignado.');
            error.statusCode = 400;
            throw error;
          }

          const material = await Material.findByPk(materialId, { transaction: t });
          if (!material) {
            const error = new Error(`El material con ID ${materialId} no existe en el catálogo.`);
            error.statusCode = 400;
            throw error;
          }

          const qty = Number(item.quantity !== undefined ? item.quantity : item.weight_kg);
          if (isNaN(qty) || qty < 0) {
            const error = new Error(`La cantidad para '${material.name}' debe ser un número válido.`);
            error.statusCode = 400;
            throw error;
          }
          totalQuantity += qty;

          let pct = item.percentage !== undefined ? Number(item.percentage) : 0;
          if (isNaN(pct) || pct <= 0) {
            pct = batchSize > 0 ? (qty / batchSize) * 100 : 0;
          }

          const isRestrictedM4 = Boolean(
            item.is_restricted_on_machine_4 ||
            (material.name && material.name.toUpperCase().includes('POLIPROPILENO (B)'))
          );

          if (isRestrictedM4) {
            hasMachine4Restriction = true;
          }

          newIngredients.push({
            formula_id: formula.id,
            material_id: materialId,
            quantity: Number(qty.toFixed(2)),
            percentage: Number(pct.toFixed(2)),
            unit: item.unit || 'KG',
            is_restricted_on_machine_4: isRestrictedM4,
            restricted_machine_ids: isRestrictedM4 ? [4] : []
          });
        }

        // Sincronizar restricciones de extrusora 4 en la fórmula
        const { Extruder } = require('../../database/models');
        const activeExtruders = await Extruder.findAll({ where: { is_active: true } });
        const allExtruderIds = activeExtruders.map(e => e.id);
        let allowed = Array.isArray(formula.allowed_extruders) ? [...formula.allowed_extruders] : allExtruderIds;
        let restricted = Array.isArray(formula.restricted_extruders) ? [...formula.restricted_extruders] : [];

        if (hasMachine4Restriction) {
          allowed = allowed.filter(id => Number(id) !== 4);
          if (!restricted.includes(4)) restricted.push(4);
        } else {
          if (!allowed.includes(4)) allowed.push(4);
          restricted = restricted.filter(id => Number(id) !== 4);
        }
        formula.allowed_extruders = allowed;
        formula.restricted_extruders = restricted;

        await FormulaIngredient.bulkCreate(newIngredients, { transaction: t });
      }

      await formula.save({ transaction: t });
      await t.commit();
      return await this.getFormulaDetailsById(formula.id);
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  // ==========================================
  // CATÁLOGO DE PRODUCTOS TERMINADOS INTERMEDIOS (PTI)
  // Carretes / Bobinas salientes enlazados a fórmulas
  // ==========================================

  /**
   * Obtiene la lista de PTIs registrados con su fórmula y material asociado.
   */
  async getPtiProducts(query = {}) {
    const { PtiProduct, Formula, Material } = require('../../database/models');
    const { Op } = require('sequelize');
    const where = {};

    if (query.is_active !== undefined && query.is_active !== 'ALL') {
      where.is_active = query.is_active === 'true' || query.is_active === true;
    }
    if (query.formula_id) {
      where.formula_id = Number(query.formula_id);
    }
    if (query.search) {
      const term = `%${query.search.trim()}%`;
      where[Op.or] = [
        { code: { [Op.iLike]: term } },
        { name: { [Op.iLike]: term } },
        { specifications: { [Op.iLike]: term } },
        { color: { [Op.iLike]: term } },
        { tape_type: { [Op.iLike]: term } },
        { denier: { [Op.eq]: Number(query.search) || -1 } },
      ];
    }

    return await PtiProduct.findAll({
      where,
      include: [
        {
          model: Formula,
          as: 'formula',
          attributes: ['id', 'code', 'name', 'cost_index', 'batch_size_kg', 'expected_yield_pieces']
        },
        {
          model: Material,
          as: 'material',
          attributes: ['id', 'internal_code', 'name']
        }
      ],
      order: [['code', 'ASC']]
    });
  }

  /**
   * Obtiene un PTI por su ID.
   */
  async getPtiProductById(id) {
    const { PtiProduct, Formula, Material } = require('../../database/models');
    const pti = await PtiProduct.findByPk(id, {
      include: [
        {
          model: Formula,
          as: 'formula',
          attributes: ['id', 'code', 'name', 'cost_index', 'batch_size_kg', 'expected_yield_pieces']
        },
        {
          model: Material,
          as: 'material',
          attributes: ['id', 'internal_code', 'name']
        }
      ]
    });
    if (!pti) {
      const error = new Error(`Producto PTI con ID ${id} no encontrado.`);
      error.statusCode = 404;
      throw error;
    }
    return pti;
  }

  /**
   * Crea un nuevo producto PTI (carrete/bobina) enlazado a su fórmula de extrusión.
   */
  async createPtiProduct(payload) {
    const { PtiProduct, Formula } = require('../../database/models');
    const {
      code, name, specifications, unit_weight_kg, unit_price, formula_id, material_id, is_active,
      extrusion_machine_number, tape_type, color, denier, tape_count, tape_count_tolerance = 10,
      tape_width_mm, transformed_cost_index = 1,
    } = payload;

    if (!name || !name.trim()) {
      const error = new Error('El nombre del producto PTI (carrete/bobina) es obligatorio.');
      error.statusCode = 400;
      throw error;
    }

    const numericProfile = {
      extrusion_machine_number: Number(extrusion_machine_number),
      denier: Number(denier),
      tape_count: Number(tape_count),
      tape_count_tolerance: Number(tape_count_tolerance),
      tape_width_mm: Number(tape_width_mm),
      transformed_cost_index: Number(transformed_cost_index),
    };
    if (!Number.isInteger(numericProfile.extrusion_machine_number) || numericProfile.extrusion_machine_number <= 0
      || !String(tape_type || '').trim() || !String(color || '').trim()
      || !Number.isInteger(numericProfile.denier) || numericProfile.denier <= 0
      || !Number.isInteger(numericProfile.tape_count) || numericProfile.tape_count <= 0
      || !Number.isInteger(numericProfile.tape_count_tolerance) || numericProfile.tape_count_tolerance < 0
      || !Number.isFinite(numericProfile.tape_width_mm) || numericProfile.tape_width_mm <= 0
      || !Number.isFinite(numericProfile.transformed_cost_index) || numericProfile.transformed_cost_index <= 0) {
      throw Object.assign(new Error('Completa extrusora, tipo, color, denier, número de cintas, tolerancia, ancho e índice de costo con valores válidos.'), { statusCode: 400 });
    }

    const formula = formula_id ? await Formula.findByPk(formula_id) : null;
    if (formula_id && !formula) {
      const error = new Error(`La fórmula seleccionada con ID ${formula_id} no existe.`);
      error.statusCode = 404;
      throw error;
    }
    if (formula) {
      const alreadyLinked = await PtiProduct.findOne({ where: { formula_id: formula.id } });
      if (alreadyLinked) {
        const error = new Error(`La fórmula '${formula.name}' ya tiene enlazado el PTI ${alreadyLinked.code}.`);
        error.statusCode = 409;
        throw error;
      }
    }

    let ptiCode = code ? code.trim().toUpperCase() : null;
    if (!ptiCode) {
      ptiCode = `PTI-${formula?.code || 'EXT'}-${Date.now().toString().slice(-4)}`;
    }

    const existing = await PtiProduct.findOne({ where: { code: ptiCode } });
    if (existing) {
      const error = new Error(`Ya existe un producto PTI registrado con el código '${ptiCode}'.`);
      error.statusCode = 400;
      throw error;
    }

    const weight = unit_weight_kg == null || unit_weight_kg === '' ? null : Number(unit_weight_kg);
    const price = Number(unit_price);
    if (weight !== null && (!Number.isFinite(weight) || weight <= 0)) throw Object.assign(new Error('El peso unitario, si se captura, debe ser mayor a cero.'), { statusCode: 400 });
    if (unit_price !== undefined && (!Number.isFinite(price) || price < 0)) throw Object.assign(new Error('El precio unitario debe ser igual o mayor a cero.'), { statusCode: 400 });

    const pti = await PtiProduct.create({
      code: ptiCode,
      name: name.trim(),
      specifications: specifications ? specifications.trim() : null,
      unit_weight_kg: weight,
      unit_price: !isNaN(price) && price >= 0 ? price : 0.00,
      extrusion_machine_number: numericProfile.extrusion_machine_number,
      tape_type: String(tape_type).trim(),
      color: String(color).trim(),
      denier: numericProfile.denier,
      tape_count: numericProfile.tape_count,
      tape_count_tolerance: numericProfile.tape_count_tolerance,
      tape_width_mm: numericProfile.tape_width_mm,
      transformed_cost_index: numericProfile.transformed_cost_index,
      formula_id: formula ? Number(formula_id) : null,
      material_id: material_id ? Number(material_id) : null,
      is_active: is_active !== undefined ? Boolean(is_active) : true
    });

    return await this.getPtiProductById(pti.id);
  }

  /**
   * Actualiza un producto PTI existente (nombre, código, especificaciones, peso unitario, precio unitario, fórmula, estado).
   */
  async updatePtiProduct(id, payload) {
    const { PtiProduct, Formula } = require('../../database/models');
    const pti = await PtiProduct.findByPk(id);
    if (!pti) {
      const error = new Error(`Producto PTI con ID ${id} no encontrado.`);
      error.statusCode = 404;
      throw error;
    }

    if (payload.name !== undefined) {
      if (!payload.name || !payload.name.trim()) {
        const error = new Error('El nombre del producto PTI no puede estar vacío.');
        error.statusCode = 400;
        throw error;
      }
      pti.name = payload.name.trim();
    }

    if (payload.code !== undefined && payload.code.trim()) {
      const newCode = payload.code.trim().toUpperCase();
      if (newCode !== pti.code) {
        const existing = await PtiProduct.findOne({ where: { code: newCode } });
        if (existing && existing.id !== pti.id) {
          const error = new Error(`El código '${newCode}' ya está en uso por otro producto PTI.`);
          error.statusCode = 400;
          throw error;
        }
        pti.code = newCode;
      }
    }

    if (payload.specifications !== undefined) {
      pti.specifications = payload.specifications ? payload.specifications.trim() : null;
    }

    const profileNumberFields = ['extrusion_machine_number', 'denier', 'tape_count', 'tape_count_tolerance', 'tape_width_mm', 'transformed_cost_index'];
    for (const field of profileNumberFields) {
      if (payload[field] === undefined) continue;
      const value = Number(payload[field]);
      const isInteger = field !== 'tape_width_mm' && field !== 'transformed_cost_index';
      const isPositive = field !== 'tape_count_tolerance';
      if (!Number.isFinite(value) || (isInteger && !Number.isInteger(value)) || (isPositive ? value <= 0 : value < 0)) {
        throw Object.assign(new Error(`El valor de ${field} no es válido.`), { statusCode: 400 });
      }
      pti[field] = value;
    }
    for (const field of ['tape_type', 'color']) {
      if (payload[field] === undefined) continue;
      const value = payload[field] == null ? '' : String(payload[field]).trim();
      if (!value) throw Object.assign(new Error(`${field === 'color' ? 'El color' : 'El tipo de cinta'} no puede quedar vacío.`), { statusCode: 400 });
      pti[field] = value;
    }

    if (payload.formula_id !== undefined) {
      const fId = payload.formula_id === null || payload.formula_id === '' ? null : Number(payload.formula_id);
      const formula = fId === null ? null : await Formula.findByPk(fId);
      if (fId !== null && !formula) {
        const error = new Error(`La fórmula con ID ${fId} no existe.`);
        error.statusCode = 404;
        throw error;
      }
      const linkedPti = fId === null ? null : await PtiProduct.findOne({ where: { formula_id: fId } });
      if (linkedPti && linkedPti.id !== pti.id) {
        const error = new Error(`La fórmula '${formula.name}' ya tiene enlazado el PTI ${linkedPti.code}.`);
        error.statusCode = 409;
        throw error;
      }
      pti.formula_id = fId;
    }

    if (payload.unit_weight_kg !== undefined) {
      const w = payload.unit_weight_kg == null || payload.unit_weight_kg === '' ? null : Number(payload.unit_weight_kg);
      if (w !== null && (!Number.isFinite(w) || w <= 0)) throw Object.assign(new Error('El peso unitario en kg debe ser mayor a 0 o quedar vacío.'), { statusCode: 400 });
      pti.unit_weight_kg = w;
    }

    if (payload.unit_price !== undefined) {
      const p = Number(payload.unit_price);
      if (isNaN(p) || p < 0) {
        const error = new Error('El precio unitario debe ser mayor o igual a 0.');
        error.statusCode = 400;
        throw error;
      }
      pti.unit_price = p;
    }

    if (payload.material_id !== undefined) {
      pti.material_id = payload.material_id ? Number(payload.material_id) : null;
    }

    if (payload.is_active !== undefined) {
      pti.is_active = Boolean(payload.is_active);
    }

    await pti.save();
    return await this.getPtiProductById(pti.id);
  }

  /**
   * Elimina un producto PTI (o valida si tiene inventario en Racks activos).
   */
  async deletePtiProduct(id) {
    const { PtiProduct, PtiRack } = require('../../database/models');
    const { Op } = require('sequelize');
    const pti = await PtiProduct.findByPk(id);
    if (!pti) {
      const error = new Error(`Producto PTI con ID ${id} no encontrado.`);
      error.statusCode = 404;
      throw error;
    }

    const activeRack = await PtiRack.findOne({
      where: {
        current_pti_type_id: { [Op.in]: [pti.id, pti.material_id].filter(Boolean) },
        current_quantity: { [Op.gt]: 0 },
      }
    });
    if (activeRack) {
      const error = new Error(`No se puede eliminar el PTI '${pti.code}' porque el Rack ${activeRack.rack_code} tiene inventario activo.`);
      error.statusCode = 400;
      throw error;
    }

    await pti.destroy();
    return {
      message: `Producto PTI '${pti.code}' eliminado exitosamente.`,
      deleted_id: id
    };
  }

  /**
   * Catálogo de extrusoras y compatibilidad de fórmulas.
   */
  async getMachines() {
    const { Extruder, Formula, ExtruderFormula, ExtruderQueue } = require('../../database/models');
    const extruders = await Extruder.findAll({
      where: { is_active: true },
      include: [
        {
          model: Formula,
          as: 'allowedFormulas',
          attributes: ['id', 'code', 'name'],
          through: { attributes: [], where: { is_allowed: true } }
        }
      ],
      order: [['id', 'ASC']]
    });

    const queues = await ExtruderQueue.findAll({
      where: { status: ['ACTIVA', 'EN_ESPERA', 'PAUSADA'] }
    });
    const compatibilityRows = await ExtruderFormula.findAll({ attributes: ['extruder_id', 'formula_id', 'is_allowed'] });
    const configuredMachineIds = new Set(compatibilityRows.map((row) => Number(row.extruder_id)));

    return extruders.map(ext => {
      const activeCount = queues.filter(q => q.extruder_id === ext.id).length;
      return {
        id: ext.id,
        code: ext.code,
        name: ext.name,
        type: ext.type,
        status: ext.status,
        notes: ext.notes,
        allowedFormulas: ext.allowedFormulas || [],
        compatible_formulas: ext.allowedFormulas || [],
        has_formula_matrix: configuredMachineIds.has(Number(ext.id)),
        active_orders_count: activeCount,
      };
    });
  }

  async updateMachine(extruderId, payload) {
    const { Extruder } = require('../../database/models');
    const machine = await Extruder.findByPk(extruderId);
    if (!machine) {
      const error = new Error(`Extrusora #${extruderId} no encontrada.`);
      error.statusCode = 404;
      throw error;
    }
    if (payload.name !== undefined) {
      const name = String(payload.name).trim();
      if (!name) {
        const error = new Error('El nombre de la extrusora es obligatorio.');
        error.statusCode = 400;
        throw error;
      }
      machine.name = name;
    }
    if (payload.type !== undefined) machine.type = String(payload.type).trim() || 'STANDARD';
    if (payload.status !== undefined) machine.status = String(payload.status).trim().toUpperCase();
    if (payload.notes !== undefined) machine.notes = payload.notes ? String(payload.notes).trim() : null;
    if (payload.is_active !== undefined) machine.is_active = Boolean(payload.is_active);
    await machine.save();
    return machine;
  }

  async updateMachineFormulaCompatibility(extruderId, formulaIds = []) {
    const { sequelize, Extruder, ExtruderFormula, Formula } = require('../../database/models');
    const machine = await Extruder.findByPk(extruderId);
    if (!machine) {
      const error = new Error(`Extrusora #${extruderId} no encontrada.`);
      error.statusCode = 404;
      throw error;
    }
    if (!Array.isArray(formulaIds)) {
      const error = new Error('La lista de fórmulas compatibles no es válida.');
      error.statusCode = 400;
      throw error;
    }
    const normalizedIds = [...new Set(formulaIds.map(Number))];
    if (normalizedIds.some((id) => !Number.isInteger(id) || id <= 0)) {
      const error = new Error('La lista contiene una fórmula no válida.');
      error.statusCode = 400;
      throw error;
    }
    const transaction = await sequelize.transaction();
    try {
      const allFormulas = await Formula.findAll({ attributes: ['id'], transaction });
      const allFormulaIds = allFormulas.map((formula) => Number(formula.id));
      if (normalizedIds.some((id) => !allFormulaIds.includes(id))) {
        const error = new Error('Una o más fórmulas seleccionadas no existen.');
        error.statusCode = 400;
        throw error;
      }
      await ExtruderFormula.destroy({ where: { extruder_id: machine.id }, transaction });
      if (allFormulaIds.length) {
        await ExtruderFormula.bulkCreate(allFormulaIds.map((formula_id) => ({
          extruder_id: machine.id,
          formula_id,
          is_allowed: normalizedIds.includes(formula_id),
        })), { transaction });
      }
      await transaction.commit();
      return this.getMachines();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Obtiene todos los Silos con su stock, lote, material y alertas de reorden.
   */
  async getSilos() {
    const { Silo, Material } = require('../../database/models');
    const silos = await Silo.findAll({
      include: [
        { model: Material, as: 'material' }
      ],
      order: [['id', 'ASC']]
    });

    return silos.map(s => {
      const plain = s.toJSON ? s.toJSON() : { ...s };
      const currentStock = Number(plain.current_stock_kg) || 0;
      const maxCap = Number(plain.capacity_kg) || 40000;
      const minCap = Number(plain.min_capacity_kg) || 5000;
      const fillPct = Math.min(100, Math.round((currentStock / (maxCap || 1)) * 100));
      const isCritical = currentStock <= minCap;
      const unitCost = Number(plain.unit_cost) || 0;
      const totalInvestment = Number((currentStock * unitCost).toFixed(2));

      return {
        ...plain,
        current_stock_kg: currentStock,
        capacity_kg: maxCap,
        min_capacity_kg: minCap,
        fill_percentage: fillPct,
        is_critical_reorder: isCritical,
        status_alert: isCritical ? 'CRITICO_REORDEN' : 'NORMAL',
        unit_cost: unitCost,
        total_investment: totalInvestment
      };
    });
  }

  /**
   * Crea un nuevo Silo en Almacén / Extrusión con asignación de material y capacidades.
   */
  async createSilo(payload) {
    const { code, name, material_id, capacity_kg, min_capacity_kg, current_stock_kg, current_lot_number, current_lot_type, unit_cost } = payload;
    if (!code || !name) {
      const err = new Error('Código y nombre del Silo son obligatorios.');
      err.statusCode = 400;
      throw err;
    }

    const { Silo, Material } = require('../../database/models');
    const existing = await Silo.findOne({ where: { code: code.trim().toUpperCase() } });
    if (existing) {
      const err = new Error(`El código de Silo '${code}' ya se encuentra registrado.`);
      err.statusCode = 400;
      throw err;
    }

    const silo = await Silo.create({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      material_id: material_id ? Number(material_id) : null,
      capacity_kg: Number(capacity_kg) || 40000.00,
      min_capacity_kg: Number(min_capacity_kg) || 5000.00,
      current_stock_kg: Number(current_stock_kg) || 0.00,
      current_lot_number: current_lot_number ? current_lot_number.trim() : 'LOTE-SILO-01',
      current_lot_type: current_lot_type ? current_lot_type.trim().toUpperCase() : 'A',
      unit_cost: Number(unit_cost) || 28.50,
      is_active: true
    });

    return await Silo.findByPk(silo.id, {
      include: [{ model: Material, as: 'material' }]
    });
  }

  /**
   * Edita un Silo existente (material asignado, capacidades mín/máx, lote, costo).
   */
  async updateSilo(id, payload) {
    const { Silo, Material } = require('../../database/models');
    const silo = await Silo.findByPk(id);
    if (!silo) {
      const err = new Error(`Silo #${id} no encontrado.`);
      err.statusCode = 404;
      throw err;
    }

    if (payload.code) silo.code = payload.code.trim().toUpperCase();
    if (payload.name) silo.name = payload.name.trim();
    if (payload.material_id !== undefined) silo.material_id = payload.material_id ? Number(payload.material_id) : null;
    if (payload.capacity_kg !== undefined) silo.capacity_kg = Number(payload.capacity_kg);
    if (payload.min_capacity_kg !== undefined) silo.min_capacity_kg = Number(payload.min_capacity_kg);
    if (payload.current_lot_type) silo.current_lot_type = payload.current_lot_type.trim().toUpperCase();
    if (payload.is_active !== undefined) silo.is_active = Boolean(payload.is_active);

    // NOTA OPERATIVA: current_stock_kg, current_lot_number y unit_cost NO son editables desde la
    // actualización de metadatos del silo para evitar descuadres. Se gobiernan por ingresos y consumos.

    await silo.save();

    return await Silo.findByPk(silo.id, {
      include: [{ model: Material, as: 'material' }]
    });
  }

  /**
   * Desactiva / Elimina lógicamente un Silo.
   */
  async deleteSilo(id) {
    const { Silo } = require('../../database/models');
    const silo = await Silo.findByPk(id);
    if (!silo) {
      const err = new Error(`Silo #${id} no encontrado.`);
      err.statusCode = 404;
      throw err;
    }

    silo.is_active = false;
    await silo.save();
    return { success: true, message: `Silo ${silo.name} desactivado correctamente.` };
  }

  /**
   * Ingreso de PP mediante factura que suma kilos directamente al Silo sin generar QRs.
   * Regla de Oro (Zero-Impact en Almacén): No genera etiquetas QR individuales de costales.
   */
  async receiveSiloInvoiceEntry(payload, userId = 1) {
    const { folio, silo_id, quantity_kg, unit_cost, supplier_id, lot_number, lot_type, notes } = payload;

    if (!folio || !folio.trim()) {
      const err = new Error('El folio de la factura es obligatorio para registrar el ingreso al Silo.');
      err.statusCode = 400;
      throw err;
    }

    const qty = Number(quantity_kg);
    if (isNaN(qty) || qty <= 0) {
      const err = new Error('La cantidad de kilos a ingresar debe ser mayor a cero.');
      err.statusCode = 400;
      throw err;
    }

    const { Silo } = require('../../database/models');

    return await sequelize.transaction(async (t) => {
      const silo = await Silo.findByPk(silo_id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!silo) {
        const err = new Error(`Silo #${silo_id} no encontrado.`);
        err.statusCode = 404;
        throw err;
      }
      if (!silo.is_active) {
        throw Object.assign(new Error(`El Silo ${silo.code} está inactivo y no puede recibir material.`), { statusCode: 400 });
      }
      if (silo.material_id && payload.material_id && Number(silo.material_id) !== Number(payload.material_id)) {
        throw Object.assign(new Error(`El Silo ${silo.code} está asignado a un material distinto del recibido.`), { statusCode: 409 });
      }

      const initialStock = Number(silo.current_stock_kg);
      const maxCap = Number(silo.capacity_kg);
      const finalStock = initialStock + qty;

      if (finalStock > maxCap) {
        const err = new Error(`Capacidad excedida: El Silo ${silo.name} tiene capacidad máxima de ${maxCap} kg. Stock actual: ${initialStock} kg, intentando sumar ${qty} kg.`);
        err.statusCode = 400;
        throw err;
      }

      const receivedLotType = lot_type == null ? null : String(lot_type).trim().toUpperCase();
      if (receivedLotType && !['A', 'B', 'C'].includes(receivedLotType)) {
        throw Object.assign(new Error('El tipo de lote del silo debe ser A, B o C.'), { statusCode: 400 });
      }
      if (initialStock > 0 && receivedLotType && silo.current_lot_type && receivedLotType !== String(silo.current_lot_type).toUpperCase()) {
        throw Object.assign(new Error(`No se puede mezclar lote tipo ${receivedLotType} con tipo ${silo.current_lot_type} mientras el silo conserva material.`), { statusCode: 409 });
      }
      const incomingUnitCost = unit_cost == null || unit_cost === '' ? null : Number(unit_cost);
      if (incomingUnitCost !== null && (!Number.isFinite(incomingUnitCost) || incomingUnitCost < 0)) {
        throw Object.assign(new Error('El costo unitario debe ser un número mayor o igual a cero.'), { statusCode: 400 });
      }
      if (incomingUnitCost !== null && finalStock > 0) {
        const oldCost = Number(silo.unit_cost || 0);
        silo.unit_cost = Number(((initialStock * oldCost + qty * incomingUnitCost) / finalStock).toFixed(4));
      }
      silo.current_stock_kg = Number(finalStock.toFixed(2));
      if (lot_number) {
        const lotNumbers = [...new Set([...(initialStock > 0 ? String(silo.current_lot_number || '').split(',').map((value) => value.trim()).filter(Boolean) : []), lot_number.trim()])];
        silo.current_lot_number = lotNumbers.join(', ').slice(0, 100);
      }
      if (receivedLotType) silo.current_lot_type = receivedLotType;
      await silo.save({ transaction: t });

      const { AuditLog } = require('../../database/models');
      await AuditLog.create({
        action: 'SILO_INVOICE_RECEPTION',
        entity_type: 'SILO',
        entity_id: silo.id.toString(),
        module: 'EXTRUSION_SILOS',
        user_id: userId,
        description: `Ingreso directo por Factura ${folio}: ${qty} kg de PP en Silo ${silo.code}.`,
        before_data: { current_stock_kg: initialStock },
        after_data: { current_stock_kg: finalStock, current_lot_number: silo.current_lot_number },
        metadata: { folio, quantity_kg: qty, unit_cost: silo.unit_cost }
      }, { transaction: t });

      return {
        message: `Ingreso de ${qty} kg de Polipropileno registrado exitosamente en Silo ${silo.code} (Factura: ${folio}).`,
        silo: {
          id: silo.id,
          code: silo.code,
          name: silo.name,
          initial_stock_kg: initialStock,
          added_kg: qty,
          current_stock_kg: Number(finalStock.toFixed(2)),
          current_lot_number: silo.current_lot_number,
          current_lot_type: silo.current_lot_type,
          unit_cost: Number(silo.unit_cost)
        }
      };
    });
  }
}

module.exports = new ExtrusionService();


