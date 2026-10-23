const { sequelize, ProcessFormula, ProcessFormulaItem, ProcessPreparation, ProcessPreparationInput, WipInventory, QrCode, QrBatch, TraceabilityEvent, Lote, Area, TraceableItem, Material } = require('../../database/models');

class ExtrusionService {
  async mixFormula(payload, userId) {
    return sequelize.transaction(async (transaction) => {
      const { formula_id, preparation_id, destination_qr_code, container_count = 1, extruder_id, inputs, area_id, notes } = payload;
      let effectiveAreaId = area_id;
      if (!effectiveAreaId) {
        const extrusionArea = await Area.findOne({ where: { code: 'EXTRUSION' }, transaction });
        effectiveAreaId = extrusionArea ? extrusionArea.id : 2;
      }

      // 1. Validar Fórmula (soporta tanto Formula oficial como ProcessFormula)
      const { Formula, FormulaIngredient } = require('../../database/models');
      let formula = await Formula.findByPk(formula_id, {
        include: [{ model: FormulaIngredient, as: 'ingredients' }],
        transaction
      });
      if (!formula) {
        formula = await ProcessFormula.findByPk(formula_id, { transaction });
      }
      if (!formula || (formula.is_active !== undefined && !formula.is_active)) {
        throw new Error('Fórmula no válida o inactiva.');
      }

      // 2. Validar restricciones de Extrusora si se especificó
      const machineId = extruder_id ? Number(extruder_id) : null;
      let extruder = null;
      let isSiloMode = false;

      if (machineId) {
        const { Extruder, Silo, ExtruderFormula } = require('../../database/models');
        extruder = await Extruder.findByPk(machineId, {
          include: [{ model: Silo, as: 'silo' }],
          transaction
        });

        if (!extruder && ![1, 2, 3, 4, 5, 6].includes(machineId)) {
          const error = new Error('Máquina no válida.');
          error.statusCode = 400;
          throw error;
        }

        isSiloMode = Boolean(extruder?.modo_silo);

        // Fase 3: Rafia exclusiva para Extrusora 1
        const isRafiaFormula = (formula.code || '').startsWith('F-EXT-1-') || formula.code === 'F-EXT-01-FIXED' || (formula.name || '').includes('RAFIA PARA CINTURÓN');
        if (isRafiaFormula && machineId !== 1) {
          const error = new Error(`Restricción de Máquina: Las fórmulas de Rafia para Cinturón son de uso exclusivo en la Extrusora 1. Intento bloqueado.`);
          error.statusCode = 400;
          throw error;
        }
        if (machineId === 1 && !isRafiaFormula) {
          const error = new Error(`Restricción de Máquina: La Extrusora 1 está asignada exclusivamente a recetas fijas de Rafia para Cinturón. Intento bloqueado.`);
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

          // Si opera en modo_silo, verificar lote del silo asignado
          if (isSiloMode && extruder?.silo) {
            const siloLotType = (extruder.silo.current_lot_type || '').toUpperCase();
            const siloLotNum = (extruder.silo.current_lot_number || '').toUpperCase();
            if (siloLotType === 'B' || siloLotNum.includes('PP-B') || siloLotNum.includes('LOTE-B')) {
              const error = new Error(`Hard-block de Seguridad Industrial: La Extrusora 4 tiene prohibido el uso de Polipropileno 'B'. El Silo asignado (${extruder.silo.code} - ${extruder.silo.name}) contiene lote de resina 'B'. Orden bloqueada.`);
              error.statusCode = 400;
              throw error;
            }
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

      // 3. Generar Nomenclatura de Contenedor(es) - Asignados automáticamente por el sistema
      const count = Math.max(1, parseInt(container_count, 10) || 1);
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const defaultPrefix = isSiloMode ? 'KIT-ADITIVOS' : 'CONT-MIX';
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
        preparation.is_silo_kit = isSiloMode;
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
          is_silo_kit: isSiloMode,
          notes: isSiloMode ? `${notes || ''} [Kit de Aditivos - Modo Silo]`.trim() : notes,
          prepared_by: userId,
          prepared_at: new Date()
        }, { transaction });
      }

      // 5. Procesar Entradas (WIP)
      const folio = preparation.folio;
      let primaryMaterialId = formula.target_intermediate_material_id || (formula.ingredients && formula.ingredients[0]?.material_id);
      for (const input of inputs) {
        const sourceQr = await QrCode.findOne({ where: { qr_code: input.qr_code }, transaction });
        if (!sourceQr) throw new Error(`QR ${input.qr_code} no encontrado.`);

        const wipItem = await WipInventory.findOne({
          where: { qr_code_id: sourceQr.id, area_id: effectiveAreaId },
          transaction,
          lock: transaction.LOCK.UPDATE
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
        const newAmount = Number(wipItem.amount) - Number(input.quantity);
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
            quantity_initial: wipItem.amount,
            quantity_current: wipItem.amount,
            unit: 'KG',
            status: 'DISPONIBLE'
          }, { transaction });
        }

        // Crear registro en ProcessPreparationInput
        await ProcessPreparationInput.create({
          preparation_id: preparation.id,
          source_traceable_item_id: sourceTraceable.id,
          source_qr_code_id: sourceQr.id,
          material_id: wipItem.material_id,
          quantity: input.quantity,
          unit: 'KG',
          balance_before: Number(wipItem.amount) + Number(input.quantity),
          balance_after: newAmount,
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
      }

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
            extruder_id: machineId || null
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
          notes: `Contenedor ${i + 1}/${count} (${cWeight} kg) generado para mezcla ${folio}. Fórmula: ${formula.name}`,
          metadata: { preparation_id: preparation.id, total_quantity: totalQuantity, container_weight: cWeight, container_number: i + 1 }
        }, { transaction });

        createdContainers.push({
          container_number: i + 1,
          total_containers: count,
          qr_code: cCode,
          qr_id: cQr.id,
          capacity_kg: cWeight,
          formula_name: formula.name,
          formula_code: formula.code || '',
          folio,
          extruder_id: machineId || null,
          created_at: new Date()
        });
      }

      preparation.total_quantity = totalQuantity;
      preparation.destination_traceable_item_id = createdContainers[0]?.qr_id || destQr.id;
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
            priority: 1, // Al final de la cola (en orden)
            status: 'EN_ESPERA',
            is_silo_kit: isSiloMode,
            notes: notes
              ? `${notes} (${isSiloMode ? 'Kit Aditivos' : 'Contenedor'} ${c.container_number}/${count} - ${c.capacity_kg} kg)`
              : `${isSiloMode ? 'Kit de Aditivos' : 'Contenedor'} ${c.container_number}/${count} - Mezcla ${folio} (${c.capacity_kg} kg)`
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
  async switchQueuePriority({ extruder_id, target_queue_id, queue_id, scrap_weight_kg, userId }) {
    const targetId = Number(target_queue_id || queue_id);
    if (!targetId) {
      const error = new Error('ID de la mezcla en cola a priorizar es obligatorio.');
      error.statusCode = 400;
      throw error;
    }

    const { ExtruderQueue, Formula, FormulaIngredient, Material, ExtrusionScrapLog, Extruder } = require('../../database/models');

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

      const formula = await Formula.findByPk(targetQueue.formula_id, {
        include: [{ model: FormulaIngredient, as: 'ingredients', include: [{ model: Material, as: 'material' }] }],
        transaction: t
      });

      const machineId = Number(extruder_id || targetQueue.extruder_id);
      const targetExtruder = await Extruder.findByPk(machineId, { transaction: t });
      if (!targetExtruder || !targetExtruder.is_active) {
        const error = new Error(`Máquina ID ${machineId} no válida o inactiva en el piso de producción.`);
        error.statusCode = 400;
        throw error;
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

      let scrapLog = null;

      // 4. Regla 3 & 4: Si se interrumpe una mezcla activa, pasar a PAUSADA y exigir peso de merma de transición/purga
      if (currentActive && currentActive.id !== targetQueue.id) {
        const scrapWeight = Number(scrap_weight_kg);
        if (isNaN(scrapWeight) || scrapWeight <= 0) {
          const error = new Error('Transición y Merma: Se requiere registrar el peso de la merma de transición/purga (kg) generada antes de que el nuevo material salga limpio.');
          error.statusCode = 400;
          throw error;
        }

        currentActive.status = 'PAUSADA';
        await currentActive.save({ transaction: t });

        scrapLog = await ExtrusionScrapLog.create({
          extruder_id: machineId,
          from_mixture_qr_id: currentActive.consumption_order_qr_id,
          to_mixture_qr_id: targetQueue.consumption_order_qr_id,
          scrap_weight_kg: scrapWeight,
          reason: 'PURGA_TRANSICION',
          logged_by: userId
        }, { transaction: t });
      }

      // 5. Iniciar la nueva mezcla con la más alta prioridad
      const maxPriority = (await ExtruderQueue.max('priority', { where: { extruder_id: machineId }, transaction: t })) || 0;
      targetQueue.status = 'ACTIVA';
      targetQueue.priority = Number(maxPriority) + 1;
      await targetQueue.save({ transaction: t });

      return {
        message: 'Mezcla activada y priorizada con éxito.',
        active_queue: targetQueue,
        paused_queue: currentActive && currentActive.id !== targetQueue.id ? currentActive : null,
        scrap_logged: scrapLog
      };
    });
  }

  /**
   * Valida el escaneo del QR del Rack y de la mezcla/PTI e ingresa material con Backflushing.
   * Puntos 5, 6, 7: Soporta ingreso directo por piezas o cálculo por peso de báscula y valorización.
   */
  async scanRackPti({
    rack_qr,
    pti_material_id,
    quantity,
    weight_kg,
    unit_weight_kg,
    unit_price,
    mixture_qr,
    scrap_weight_kg = 0,
    scrap_reason = 'DESPERDICIO_OPERATIVO',
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

    const { PtiRack, Material, Formula, FormulaIngredient, ExtruderQueue, Lote } = require('../../database/models');
    const consumptionService = require('./services/consumption.service');

    return await sequelize.transaction(async (t) => {
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
      const rackUnitWeight = Number(unit_weight_kg) || Number(rack.unit_weight_kg) || 6.800;
      if ((!pieces || pieces <= 0) && scaleWeight > 0) {
        pieces = Math.round(scaleWeight / rackUnitWeight);
      }

      if (!pieces || pieces <= 0) {
        const error = new Error('La cantidad de piezas o peso de PTI debe ser un valor mayor a cero.');
        error.statusCode = 400;
        throw error;
      }

      let currentPtiType = null;
      if (rack.current_pti_type_id) {
        currentPtiType = await Material.findByPk(rack.current_pti_type_id, { transaction: t });
      }

      // 2. Validar capacidad del Rack
      const currentQty = Number(rack.current_quantity || 0);
      const maxCap = Number(rack.max_capacity || 100);

      if (rack.status === 'LLENO' || currentQty + pieces > maxCap) {
        const error = new Error(`Capacidad Excedida: El Rack ${rack.rack_code} no puede recibir ${pieces} piezas. Capacidad máxima: ${maxCap}, Disponible: ${Math.max(0, maxCap - currentQty)}.`);
        error.statusCode = 400;
        throw error;
      }

      const { PtiProduct } = require('../../database/models');
      const ptiProduct = await PtiProduct.findByPk(ptiId, {
        include: [{
          model: Formula,
          as: 'formula',
          include: [{ model: FormulaIngredient, as: 'ingredients', include: [{ model: Material, as: 'material' }] }]
        }],
        transaction: t
      });
      const effectiveMaterialId = (ptiProduct && ptiProduct.material_id) ? ptiProduct.material_id : ptiId;

      // 3. Regla 5: Racks Dinámicos (Condicionamiento)
      if (rack.status !== 'VACIO' && rack.current_pti_type_id) {
        if (rack.current_pti_type_id !== effectiveMaterialId && rack.current_pti_type_id !== ptiId) {
          const conditionedName = currentPtiType?.name || `#${rack.current_pti_type_id}`;
          const error = new Error(`Incompatibilidad de Rack: El Rack ${rack.rack_code} está condicionado exclusivamente para el material PTI '${conditionedName}'. No se permite mezclar con PTI #${ptiId}.`);
          error.statusCode = 400;
          throw error;
        }
      } else {
        rack.current_pti_type_id = effectiveMaterialId;
      }

      // 4. Actualizar cantidad
      rack.current_quantity = currentQty + pieces;
      if (unit_weight_kg) {
        rack.unit_weight_kg = Number(unit_weight_kg);
      }

      // 5. Backflushing y Fórmula
      let formula = null;

      if (ptiProduct) {
        if (!unit_weight_kg && ptiProduct.unit_weight_kg) {
          rack.unit_weight_kg = Number(ptiProduct.unit_weight_kg);
        }
        if (!formula && ptiProduct.formula) {
          formula = ptiProduct.formula;
        }
      }

      let queueItem = null;
      let effectiveExtruderId = 1;
      let isSiloKit = false;

      if (mixture_qr) {
        queueItem = await ExtruderQueue.findOne({
          where: { consumption_order_qr_id: mixture_qr },
          include: [{
            model: Formula,
            as: 'formula',
            include: [{ model: FormulaIngredient, as: 'ingredients', include: [{ model: Material, as: 'material' }] }]
          }],
          transaction: t
        });

        if (queueItem) {
          effectiveExtruderId = queueItem.extruder_id;
          isSiloKit = Boolean(queueItem.is_silo_kit);
          if (queueItem.formula) {
            formula = queueItem.formula;
          }
        }
      }

      if (!formula) {
        formula = await Formula.findOne({
          include: [{ model: FormulaIngredient, as: 'ingredients', include: [{ model: Material, as: 'material' }] }],
          transaction: t
        });
      }

      const { Extruder, Silo } = require('../../database/models');
      const extruder = await Extruder.findByPk(effectiveExtruderId, {
        include: [{ model: Silo, as: 'silo' }],
        transaction: t
      });

      const isSiloMode = Boolean((extruder && extruder.modo_silo) || isSiloKit);

      // Descuento de materiales vía Backflushing
      let backflushingResult = null;
      let siloDeductionResult = null;

      if (formula) {
        const consumptionResult = await consumptionService.processConsumption({
          formula,
          pieces,
          scrapWeightKg: Number(scrap_weight_kg) || 0,
          isSiloMode,
          extruderId: effectiveExtruderId,
          transaction: t,
          notes: `Producción de ${pieces} piezas en Rack ${rack.rack_code}`,
          userId
        });

        backflushingResult = consumptionResult.backflushing;
        siloDeductionResult = consumptionResult.silo_deduction;
      }

      // Puntos 3, 3.1 & 6: Valorización del PTI (con precio de catálogo o cálculo con cost_index)
      let calculatedPtiPrice = Number(unit_price) || (ptiProduct && Number(ptiProduct.unit_price) > 0 ? Number(ptiProduct.unit_price) : 0) || Number(rack.unit_price) || 0;
      if (calculatedPtiPrice <= 0 && formula) {
        // Calcular valor de la mezcla con índice configurado en la fórmula (default 1.15)
        const formulaIndex = Number(formula.cost_index) > 0 ? Number(formula.cost_index) : 1.15;
        let formulaRawCost = 0;
        for (const ing of formula.ingredients || []) {
          const qty = Number(ing.quantity || 0);
          let uCost = 25.0;

          if (isSiloMode && consumptionService.isPpMaterial(ing) && extruder?.silo) {
            uCost = Number(extruder.silo.unit_cost);
          } else {
            const lastLote = await Lote.findOne({
              where: { material_id: ing.material_id },
              order: [['created_at', 'DESC']],
              transaction: t
            });
            uCost = lastLote && Number(lastLote.unit_cost) > 0 ? Number(lastLote.unit_cost) : 25.0;
          }
          formulaRawCost += qty * uCost;
        }
        const mixValue = formulaRawCost * formulaIndex;
        const expectedPieces = Number(formula.expected_yield_pieces) || 70;
        calculatedPtiPrice = Number((mixValue / expectedPieces).toFixed(2));
      }

      if (calculatedPtiPrice > 0) {
        rack.unit_price = calculatedPtiPrice;
      }

      await rack.save({ transaction: t });

      const scrapKg = Math.max(0, Number(scrap_weight_kg) || 0);
      let scrapLog = null;
      if (scrapKg > 0) {
        const { ExtrusionScrapLog } = require('../../database/models');
        scrapLog = await ExtrusionScrapLog.create({
          extruder_id: effectiveExtruderId,
          from_mixture_qr_id: mixture_qr || 'OPERACION_CONTINUA',
          to_mixture_qr_id: null,
          scrap_weight_kg: scrapKg,
          reason: scrap_reason || 'DESPERDICIO_OPERATIVO',
          notes: notes || `Merma operativa registrada al llenar rack de bobinas (${isSiloMode ? 'Deducida 100% de Silo PP' : 'Mezcla manual'})`,
          logged_by: userId
        }, { transaction: t });
      }

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
          unit_weight_kg: Number(rack.unit_weight_kg || 6.8),
          total_value: Number((Number(rack.current_quantity) * Number(rack.unit_price || 0)).toFixed(2))
        },
        backflushing: backflushingResult,
        silo_deduction: siloDeductionResult,
        scrap_logged: scrapLog
      };
    });
  }

  /**
   * Obtiene las colas de las extrusoras dinámicamente desde el catálogo de extruders.
   */
  async getExtruderQueues() {
    const { Extruder, Silo, ExtruderQueue, Formula, FormulaIngredient, Material } = require('../../database/models');

    const queues = await ExtruderQueue.findAll({
      include: [
        {
          model: Formula,
          as: 'formula',
          include: [{ model: FormulaIngredient, as: 'ingredients', include: [{ model: Material, as: 'material' }] }]
        }
      ],
      order: [
        ['extruder_id', 'ASC'],
        ['priority', 'DESC'],
        ['created_at', 'ASC']
      ]
    });

    const extruders = await Extruder.findAll({
      where: { is_active: true },
      include: [{ model: Silo, as: 'silo' }],
      order: [['id', 'ASC']]
    });

    return extruders.map(ext => {
      const machineQueues = queues.filter(q => q.extruder_id === ext.id);
      const active = machineQueues.find(q => q.status === 'ACTIVA') || null;
      const paused = machineQueues.filter(q => q.status === 'PAUSADA');
      const waiting = machineQueues.filter(q => q.status === 'EN_ESPERA');

      return {
        machine: {
          id: ext.id,
          code: ext.code,
          name: ext.name,
          type: ext.type,
          status: ext.status,
          modo_silo: ext.modo_silo,
          silo: ext.silo ? {
            id: ext.silo.id,
            code: ext.silo.code,
            name: ext.silo.name,
            current_stock_kg: Number(ext.silo.current_stock_kg),
            capacity_kg: Number(ext.silo.capacity_kg),
            current_lot_type: ext.silo.current_lot_type,
            current_lot_number: ext.silo.current_lot_number,
            unit_cost: Number(ext.silo.unit_cost)
          } : null
        },
        active,
        paused,
        waiting,
        total_in_queue: machineQueues.length
      };
    });
  }

  /**
   * Encola una mezcla en una extrusora validando restricciones de máquina y Silo.
   */
  async enqueueMix({ extruder_id, consumption_order_qr_id, formula_id, priority = 1, is_silo_kit = false, notes }) {
    const machineId = Number(extruder_id);
    const { Extruder, Silo, ExtruderFormula, ExtruderQueue, Formula, FormulaIngredient, Material } = require('../../database/models');

    const extruder = await Extruder.findByPk(machineId, {
      include: [{ model: Silo, as: 'silo' }]
    });

    if (!extruder && ![1, 2, 3, 4, 5, 6].includes(machineId)) {
      const error = new Error('Máquina no válida.');
      error.statusCode = 400;
      throw error;
    }

    const isSiloMode = Boolean(extruder?.modo_silo || is_silo_kit);

    const formula = await Formula.findByPk(formula_id, {
      include: [{ model: FormulaIngredient, as: 'ingredients', include: [{ model: Material, as: 'material' }] }]
    });

    if (!formula) {
      const error = new Error('Fórmula especificada no encontrada.');
      error.statusCode = 404;
      throw error;
    }

    // Restricción Rafia exclusivo Extrusora 1
    const isRafiaFormula = (formula.code || '').startsWith('F-EXT-1-') || formula.code === 'F-EXT-01-FIXED' || (formula.name || '').includes('RAFIA PARA CINTURÓN');
    if (isRafiaFormula && machineId !== 1) {
      const error = new Error(`Restricción de Máquina: Las fórmulas de Rafia para Cinturón son de uso exclusivo en la Extrusora 1. Intento bloqueado.`);
      error.statusCode = 400;
      throw error;
    }
    if (machineId === 1 && !isRafiaFormula) {
      const error = new Error(`Restricción de Máquina: La Extrusora 1 está asignada exclusivamente a recetas fijas de Rafia para Cinturón. Intento bloqueado.`);
      error.statusCode = 400;
      throw error;
    }

    // Restricción Extrusora 4: PROHIBIDO PP-B (Fórmula o Silo)
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

      // Hard-block: Si opera en modo silo y el silo asignado contiene lote B
      if (isSiloMode && extruder?.silo) {
        const siloLotType = (extruder.silo.current_lot_type || '').toUpperCase();
        const siloLotNum = (extruder.silo.current_lot_number || '').toUpperCase();
        if (siloLotType === 'B' || siloLotNum.includes('PP-B') || siloLotNum.includes('LOTE-B')) {
          const error = new Error(`Hard-block de Seguridad Industrial: La Extrusora 4 tiene prohibido el uso de Polipropileno 'B'. El Silo asignado (${extruder.silo.code} - ${extruder.silo.name}) contiene lote de resina 'B'. Orden bloqueada.`);
          error.statusCode = 400;
          throw error;
        }
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
      priority: Number(priority) || 1,
      status: 'EN_ESPERA',
      is_silo_kit: isSiloMode,
      notes: isSiloMode ? `${notes || ''} [Kit de Aditivos - Tolva Silo]`.trim() : notes
    });

    return newQueue;
  }

  /**
   * Crea un nuevo Rack de PTI en piso de extrusión.
   * Punto 5: Autogenera un QR fijo e inserta el registro en QrCodes.
   * Puntos 6 y 7: Soporta precio unitario y peso unitario por pieza.
   */
  async createPtiRack({ rack_code, max_capacity = 100, location_name, unit_price = 0, unit_weight_kg = 6.8 }) {
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
      unit_weight_kg: Number(unit_weight_kg) || 6.800,
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
    if (unit_weight_kg !== undefined) rack.unit_weight_kg = Number(unit_weight_kg) || 6.800;
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
      plain.unit_weight_kg = Number(plain.unit_weight_kg || plain.currentPtiProduct?.unit_weight_kg || 6.800);
      plain.total_value = Number((qty * price).toFixed(2));
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
    last_pti_quantity = 0,
    first_pti_quantity = 0,
    reason = 'CAMBIO_DE_FORMULA',
    notes,
    userId
  }) {
    const { Extruder } = require('../../database/models');
    const machineId = Number(extruder_id);
    const targetExtruder = await Extruder.findByPk(machineId);
    if (!targetExtruder || !targetExtruder.is_active) {
      const error = new Error(`Máquina ID ${machineId} no válida o inactiva.`);
      error.statusCode = 400;
      throw error;
    }

    if (isNaN(scrapKg) || scrapKg < 0) {
      const error = new Error('La merma de transición en kg debe ser un número mayor o igual a cero.');
      error.statusCode = 400;
      throw error;
    }

    const { ExtrusionScrapLog, ExtruderQueue } = require('../../database/models');

    // Registrar log de merma con from_mixture_qr_id y to_mixture_qr_id
    const scrapLog = await ExtrusionScrapLog.create({
      extruder_id: machineId,
      from_mixture_qr_id: from_mixture_qr,
      to_mixture_qr_id: to_mixture_qr,
      scrap_weight_kg: scrapKg,
      reason,
      notes: notes || `Cambio de mezcla/fórmula en Extrusora ${machineId}. Bobinas lote previo: ${last_pti_quantity}, Bobinas lote nuevo: ${first_pti_quantity}.`,
      logged_by: userId || 1
    });

    // Si la nueva mezcla está en cola, actualizarla a ACTIVA
    if (to_mixture_qr) {
      const nextQueue = await ExtruderQueue.findOne({
        where: { extruder_id: machineId, consumption_order_qr_id: to_mixture_qr }
      });
      if (nextQueue && nextQueue.status === 'EN_ESPERA') {
        nextQueue.status = 'ACTIVA';
        await nextQueue.save();
      }
    }

    return {
      message: `Transición de mezcla registrada en Extrusora ${machineId}. Merma de cambio: ${scrapKg} kg.`,
      transition_scrap_kg: scrapKg,
      from_mixture_qr,
      to_mixture_qr,
      last_pti_quantity: Number(last_pti_quantity),
      first_pti_quantity: Number(first_pti_quantity),
      scrap_log: scrapLog
    };
  }

  /**
   * Puntos 3 y 3.2: Calcula la valorización total del proceso de producción en Extrusión.
   * Incluye mezclas en cola, mezclas activas (en proceso) y PTI generado en racks.
   */
  async getExtrusionValuation({ cost_index = 1.15 } = {}) {
    const { Extruder, Silo, ExtruderQueue, Formula, FormulaIngredient, Material, PtiRack, Lote } = require('../../database/models');
    const factor = Number(cost_index) || 1.15;
    const consumptionService = require('./services/consumption.service');

    const queues = await ExtruderQueue.findAll({
      include: [{
        model: Formula,
        as: 'formula',
        include: [{
          model: FormulaIngredient,
          as: 'ingredients',
          include: [{ model: Material, as: 'material' }]
        }]
      }]
    });

    const extruders = await Extruder.findAll({ include: [{ model: Silo, as: 'silo' }] });
    const extruderMap = new Map(extruders.map(e => [e.id, e]));

    const estimateFormulaCost = async (formula, isSiloMode = false) => {
      if (!formula || !formula.ingredients) return 13000.00;
      let rawCost = 0;
      for (const ing of formula.ingredients) {
        // En modo silo, la mezcla en cola/piso es solo el kit de aditivos. El PP se deduce del silo hasta producir.
        if (isSiloMode && consumptionService.isPpMaterial(ing)) {
          continue;
        }
        const qty = Number(ing.quantity || 0);
        const lastLote = await Lote.findOne({
          where: { material_id: ing.material_id },
          order: [['created_at', 'DESC']]
        });
        const unitCost = lastLote && Number(lastLote.unit_cost) > 0 ? Number(lastLote.unit_cost) : 26.50;
        rawCost += qty * unitCost;
      }
      return Number((rawCost * factor).toFixed(2));
    };

    let queuedValue = 0;
    let activeValue = 0;
    const queuedItems = [];
    const activeItems = [];

    for (const q of queues) {
      const ext = extruderMap.get(q.extruder_id);
      const isSilo = Boolean(q.is_silo_kit || ext?.modo_silo);
      const val = await estimateFormulaCost(q.formula, isSilo);
      if (q.status === 'EN_ESPERA') {
        queuedValue += val;
        queuedItems.push({ id: q.id, extruder_id: q.extruder_id, qr: q.consumption_order_qr_id, value: val, is_silo_kit: isSilo });
      } else if (q.status === 'ACTIVA') {
        activeValue += val;
        activeItems.push({ id: q.id, extruder_id: q.extruder_id, qr: q.consumption_order_qr_id, value: val, is_silo_kit: isSilo });
      }
    }

    const racks = await PtiRack.findAll({
      include: [{ model: Material, as: 'currentPtiType' }]
    });

    let ptiRacksValue = 0;
    const racksData = racks.map(r => {
      const qty = Number(r.current_quantity || 0);
      const price = Number(r.unit_price || 0) > 0 ? Number(r.unit_price) : 185.00;
      const totalVal = Number((qty * price).toFixed(2));
      ptiRacksValue += totalVal;
      return {
        id: r.id,
        rack_code: r.rack_code,
        current_quantity: qty,
        unit_price: price,
        unit_weight_kg: Number(r.unit_weight_kg || 6.800),
        total_value: totalVal,
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
    const plain = formula.toJSON ? formula.toJSON() : formula;

    if (plain.ingredients && Array.isArray(plain.ingredients)) {
      for (const ing of plain.ingredients) {
        const qty = Number(ing.quantity || 0);
        const lastLote = await Lote.findOne({
          where: { material_id: ing.material_id },
          order: [['created_at', 'DESC']]
        });
        const unitCost = lastLote && Number(lastLote.unit_cost) > 0 ? Number(lastLote.unit_cost) : 26.50;
        rawMaterialsCost += qty * unitCost;
      }
    }

    const costIndex = Number(plain.cost_index) || 1.1500;
    const transformedMixtureValue = Number((rawMaterialsCost * costIndex).toFixed(2));
    const expectedPieces = Number(plain.expected_yield_pieces) || 0;
    const suggestedPtiUnitPrice = expectedPieces > 0 ? Number((transformedMixtureValue / expectedPieces).toFixed(2)) : 0;

    return {
      ...plain,
      cost_index: costIndex,
      raw_materials_cost: Number(rawMaterialsCost.toFixed(2)),
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
  async registerOperationalScrap({ extruder_id, mixture_qr_id, scrap_weight_kg, reason = 'DESPERDICIO_OPERATIVO', notes, userId }) {
    const scrapWeight = Number(scrap_weight_kg);
    if (isNaN(scrapWeight) || scrapWeight <= 0) {
      const error = new Error('El peso de la merma/scrap debe ser mayor a 0 kg.');
      error.statusCode = 400;
      throw error;
    }

    const { Extruder, ExtrusionScrapLog, ExtruderQueue } = require('../../database/models');
    const machineId = Number(extruder_id);
    const targetExtruder = await Extruder.findByPk(machineId);
    if (!targetExtruder || !targetExtruder.is_active) {
      const error = new Error(`Máquina ID ${machineId} no válida o inactiva.`);
      error.statusCode = 400;
      throw error;
    }

    let mixQr = mixture_qr_id;
    if (!mixQr) {
      const activeQueue = await ExtruderQueue.findOne({
        where: { extruder_id: machineId, status: 'ACTIVA' }
      });
      mixQr = activeQueue?.consumption_order_qr_id || `EXT-${machineId}-RUN`;
    }

    const scrapLog = await ExtrusionScrapLog.create({
      extruder_id: machineId,
      from_mixture_qr_id: mixQr,
      to_mixture_qr_id: null,
      scrap_weight_kg: scrapWeight,
      reason,
      notes: notes || null,
      logged_by: userId
    });

    const balance = await this.getMassBalance(mixQr);

    return {
      message: `Merma de ${scrapWeight} kg registrada correctamente.`,
      scrap_log: scrapLog,
      mass_balance: balance
    };
  }

  /**
   * Calcula el Balance de Masa exacto de una mezcla en Extrusión.
   * Entrada (kg) = Producto Útil (kg) + Merma/Scrap (kg) + Diferencia no cuantificada.
   * Golden Rule #2 y #6: El frontend NUNCA calcula indicadores ni balances; el backend entrega el DTO.
   */
  async getMassBalance(mixture_qr_id) {
    const { ExtrusionScrapLog, ProcessPreparation, ExtruderQueue, Formula } = require('../../database/models');

    let initialBatchKg = 500.00;
    let formulaName = 'Fórmula Extrusión Estándar (500kg)';

    const prep = await ProcessPreparation.findOne({
      where: { folio: mixture_qr_id }
    });
    if (prep && Number(prep.total_quantity) > 0) {
      initialBatchKg = Number(prep.total_quantity);
    } else {
      const queue = await ExtruderQueue.findOne({
        where: { consumption_order_qr_id: mixture_qr_id },
        include: [{ model: Formula, as: 'formula' }]
      });
      if (queue?.formula?.batch_size_kg) {
        initialBatchKg = Number(queue.formula.batch_size_kg);
        formulaName = queue.formula.name;
      }
    }

    const scrapLogs = await ExtrusionScrapLog.findAll({
      where: { from_mixture_qr_id: mixture_qr_id },
      order: [['created_at', 'DESC']]
    });

    const totalScrapKg = scrapLogs.reduce((sum, log) => sum + Number(log.scrap_weight_kg || 0), 0);
    const scrapPercentage = initialBatchKg > 0 ? Number(((totalScrapKg / initialBatchKg) * 100).toFixed(2)) : 0;
    const estimatedUsefulKg = Number(Math.max(0, initialBatchKg - totalScrapKg).toFixed(2));
    const estimatedYieldPercentage = Number(Math.max(0, 100 - scrapPercentage).toFixed(2));

    let status = 'OPTIMO';
    if (scrapPercentage > 10) {
      status = 'ALERTA_EXCESO_MERMA';
    } else if (scrapPercentage > 5) {
      status = 'TOLERABLE';
    }

    return {
      mixture_qr: mixture_qr_id,
      formula_name: formulaName,
      batch_size_kg: initialBatchKg,
      total_scrap_kg: Number(totalScrapKg.toFixed(2)),
      scrap_percentage: scrapPercentage,
      estimated_useful_kg: estimatedUsefulKg,
      estimated_yield_percentage: estimatedYieldPercentage,
      scrap_status: status,
      scrap_logs: scrapLogs
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
    const { Formula, FormulaIngredient, Material, sequelize } = require('../../database/models');
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
        { specifications: { [Op.iLike]: term } }
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
    const { code, name, specifications, unit_weight_kg, unit_price, formula_id, material_id, is_active } = payload;

    if (!name || !name.trim()) {
      const error = new Error('El nombre del producto PTI (carrete/bobina) es obligatorio.');
      error.statusCode = 400;
      throw error;
    }

    if (!formula_id) {
      const error = new Error('Debes seleccionar la fórmula de extrusión enlazada que genera este PTI.');
      error.statusCode = 400;
      throw error;
    }

    const formula = await Formula.findByPk(formula_id);
    if (!formula) {
      const error = new Error(`La fórmula seleccionada con ID ${formula_id} no existe.`);
      error.statusCode = 404;
      throw error;
    }

    let ptiCode = code ? code.trim().toUpperCase() : null;
    if (!ptiCode) {
      ptiCode = `PTI-${formula.code || 'EXT'}-${Date.now().toString().slice(-4)}`;
    }

    const existing = await PtiProduct.findOne({ where: { code: ptiCode } });
    if (existing) {
      const error = new Error(`Ya existe un producto PTI registrado con el código '${ptiCode}'.`);
      error.statusCode = 400;
      throw error;
    }

    const weight = Number(unit_weight_kg);
    const price = Number(unit_price);

    const pti = await PtiProduct.create({
      code: ptiCode,
      name: name.trim(),
      specifications: specifications ? specifications.trim() : null,
      unit_weight_kg: !isNaN(weight) && weight > 0 ? weight : 6.800,
      unit_price: !isNaN(price) && price >= 0 ? price : 0.00,
      formula_id: Number(formula_id),
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

    if (payload.formula_id !== undefined) {
      const fId = Number(payload.formula_id);
      const formula = await Formula.findByPk(fId);
      if (!formula) {
        const error = new Error(`La fórmula con ID ${fId} no existe.`);
        error.statusCode = 404;
        throw error;
      }
      pti.formula_id = fId;
    }

    if (payload.unit_weight_kg !== undefined) {
      const w = Number(payload.unit_weight_kg);
      if (isNaN(w) || w <= 0) {
        const error = new Error('El peso unitario en kg debe ser mayor a 0.');
        error.statusCode = 400;
        throw error;
      }
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
      where: { current_pti_type_id: pti.id, current_quantity: { [Op.gt]: 0 } }
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
   * Catálogo de Extrusoras con toggle híbrido modo_silo, estado y silos asignados.
   */
  async getMachines() {
    const { Extruder, Silo, Formula, ExtruderQueue } = require('../../database/models');
    const extruders = await Extruder.findAll({
      where: { is_active: true },
      include: [
        { model: Silo, as: 'silo' },
        { model: Formula, as: 'allowedFormulas', attributes: ['id', 'code', 'name'] }
      ],
      order: [['id', 'ASC']]
    });

    const queues = await ExtruderQueue.findAll({
      where: { status: ['ACTIVA', 'EN_ESPERA', 'PAUSADA'] }
    });

    return extruders.map(ext => {
      const activeCount = queues.filter(q => q.extruder_id === ext.id).length;
      return {
        id: ext.id,
        code: ext.code,
        name: ext.name,
        type: ext.type,
        status: ext.status,
        modo_silo: ext.modo_silo,
        silo_id: ext.silo_id,
        silo: ext.silo ? {
          id: ext.silo.id,
          code: ext.silo.code,
          name: ext.silo.name,
          current_stock_kg: Number(ext.silo.current_stock_kg),
          capacity_kg: Number(ext.silo.capacity_kg),
          current_lot_type: ext.silo.current_lot_type,
          current_lot_number: ext.silo.current_lot_number,
          unit_cost: Number(ext.silo.unit_cost)
        } : null,
        allowedFormulas: ext.allowedFormulas || [],
        active_orders_count: activeCount,
        can_toggle_silo: activeCount === 0
      };
    });
  }

  /**
   * Toggle Híbrido: modo_silo (boolean).
   * Restricción: Bloquea el cambio si la máquina tiene órdenes 'En Proceso' o mezclas 'Encoladas'.
   */
  async toggleModoSilo(extruderId, { modo_silo }) {
    const { Extruder, ExtruderQueue } = require('../../database/models');
    const machine = await Extruder.findByPk(extruderId);
    if (!machine) {
      const err = new Error(`Extrusora #${extruderId} no encontrada.`);
      err.statusCode = 404;
      throw err;
    }

    const targetState = Boolean(modo_silo);
    if (machine.modo_silo === targetState) {
      return machine;
    }

    const activeQueues = await ExtruderQueue.count({
      where: {
        extruder_id: extruderId,
        status: ['ACTIVA', 'EN_ESPERA', 'PAUSADA']
      }
    });

    if (activeQueues > 0) {
      const err = new Error(
        `Operación bloqueada: No se puede cambiar el modo operativo (${targetState ? 'Silo' : 'Manual'}) de la ${machine.name} mientras tenga órdenes en proceso o mezclas encoladas (${activeQueues} registros activos en cola).`
      );
      err.statusCode = 400;
      throw err;
    }

    machine.modo_silo = targetState;
    await machine.save();
    return machine;
  }

  /**
   * Asignación de Silo a Extrusora con validación estricta para Extrusora 4 (CERO PP-B).
   */
  async assignExtruderSilo(extruderId, { silo_id }) {
    const { Extruder, Silo } = require('../../database/models');
    const machine = await Extruder.findByPk(extruderId);
    if (!machine) {
      const err = new Error(`Extrusora #${extruderId} no encontrada.`);
      err.statusCode = 404;
      throw err;
    }

    const silo = await Silo.findByPk(silo_id);
    if (!silo) {
      const err = new Error(`Silo #${silo_id} no encontrado.`);
      err.statusCode = 404;
      throw err;
    }

    if (Number(extruderId) === 4) {
      const siloLotType = (silo.current_lot_type || '').toUpperCase();
      const siloLotNum = (silo.current_lot_number || '').toUpperCase();
      if (siloLotType === 'B' || siloLotNum.includes('PP-B') || siloLotNum.includes('LOTE-B')) {
        const err = new Error(
          `Restricción de Seguridad: La Extrusora 4 tiene estrictamente prohibido el uso de Polipropileno 'B'. El silo seleccionado (${silo.name}) contiene resina Lote tipo 'B'. Asignación bloqueada.`
        );
        err.statusCode = 400;
        throw err;
      }
    }

    machine.silo_id = silo.id;
    await machine.save();
    return machine;
  }

  /**
   * Obtiene todos los Silos con su stock, lote y máquinas asociadas.
   */
  async getSilos() {
    const { Silo, Extruder, Material } = require('../../database/models');
    return await Silo.findAll({
      include: [
        { model: Extruder, as: 'extruders', attributes: ['id', 'name', 'code', 'modo_silo', 'status'] },
        { model: Material, as: 'material' }
      ],
      order: [['id', 'ASC']]
    });
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

    const { Silo, InventoryMovement, TraceabilityEvent } = require('../../database/models');

    return await sequelize.transaction(async (t) => {
      const silo = await Silo.findByPk(silo_id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!silo) {
        const err = new Error(`Silo #${silo_id} no encontrado.`);
        err.statusCode = 404;
        throw err;
      }

      const initialStock = Number(silo.current_stock_kg);
      const maxCap = Number(silo.capacity_kg);
      const finalStock = initialStock + qty;

      if (finalStock > maxCap) {
        const err = new Error(`Capacidad excedida: El Silo ${silo.name} tiene capacidad máxima de ${maxCap} kg. Stock actual: ${initialStock} kg, intentando sumar ${qty} kg.`);
        err.statusCode = 400;
        throw err;
      }

      silo.current_stock_kg = Number(finalStock.toFixed(2));
      if (lot_number) silo.current_lot_number = lot_number.trim();
      if (lot_type) silo.current_lot_type = lot_type.trim().toUpperCase();
      if (unit_cost && Number(unit_cost) > 0) silo.unit_cost = Number(unit_cost);
      await silo.save({ transaction: t });

      if (silo.material_id) {
        await InventoryMovement.create({
          material_id: silo.material_id,
          movement_type: 'ENTRY',
          quantity: qty,
          balance_after: finalStock,
          notes: notes || `Recepción directa de PP en Silo ${silo.code} mediante Factura ${folio}. Lote: ${silo.current_lot_number} (Tipo ${silo.current_lot_type}). Cero impacto en etiquetas QR de almacén.`,
          created_by: userId
        }, { transaction: t });
      }

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


