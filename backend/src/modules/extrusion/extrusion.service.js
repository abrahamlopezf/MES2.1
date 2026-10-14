const { sequelize, ProcessFormula, ProcessFormulaItem, ProcessPreparation, ProcessPreparationInput, WipInventory, QrCode, TraceabilityEvent, Lote, Area } = require('../../database/models');

class ExtrusionService {
  async mixFormula(payload, userId) {
    return sequelize.transaction(async (transaction) => {
      const { formula_id, preparation_id, destination_qr_code, inputs, area_id, notes } = payload;

      // 1. Validar Fórmula
      const formula = await ProcessFormula.findByPk(formula_id, { transaction });
      if (!formula || !formula.is_active) {
        throw new Error('Fórmula no válida o inactiva.');
      }

      // 2. Validar QR Destino
      const destQr = await QrCode.findOne({ where: { qr_code: destination_qr_code }, transaction });
      if (!destQr || destQr.status !== 'GENERATED') {
        throw new Error('El código QR de destino no existe o ya está en uso.');
      }

      // 3. Generar Folio
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
        await preparation.save({ transaction });
      } else {
        const folio = `MIX-EXT-${Date.now()}`;
        preparation = await ProcessPreparation.create({
          folio,
          formula_id,
          from_area_id: area_id,
          to_area_id: area_id, // Default
          destination_qr_code_id: destQr.id,
          total_quantity: 0,
          unit: 'KG',
          status: 'PREPARADA',
          notes,
          prepared_by: userId,
          prepared_at: new Date()
        }, { transaction });
      }

      // 4. Procesar Entradas (WIP)
      const folio = preparation.folio;
      for (const input of inputs) {
        const sourceQr = await QrCode.findOne({ where: { qr_code: input.qr_code }, transaction });
        if (!sourceQr) throw new Error(`QR ${input.qr_code} no encontrado.`);

        const wipItem = await WipInventory.findOne({
          where: { qr_code_id: sourceQr.id, area_id },
          transaction,
          lock: transaction.LOCK.UPDATE
        });

        if (!wipItem) {
          throw new Error(`El material con QR ${input.qr_code} no se encuentra en el WIP de Extrusión.`);
        }

        if (Number(wipItem.amount) < Number(input.quantity)) {
          throw new Error(`Cantidad insuficiente en el QR ${input.qr_code}. Disponible: ${wipItem.amount}.`);
        }

        // Descontar
        const newAmount = Number(wipItem.amount) - Number(input.quantity);
        wipItem.amount = newAmount;
        await wipItem.save({ transaction });

        totalQuantity += Number(input.quantity);

        // Crear registro en ProcessPreparationInput
        await ProcessPreparationInput.create({
          preparation_id: preparation.id,
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

      // 5. Actualizar Totales
      preparation.total_quantity = totalQuantity;
      await preparation.save({ transaction });

      // 6. Actualizar QR Destino (La mezcla está en el piso de Extrusión, en un carrito o silo)
      await destQr.update({
        status: 'EN_USO', // Es un lote de mezcla activo
        assigned_area_id: preparation.to_area_id, // Asignado a la Extrusora destino
      }, { transaction });

      await TraceabilityEvent.create({
        qr_code_id: destQr.id,
        event_type: 'GENERACION_MEZCLA',
        entity_type: 'ProcessPreparation',
        entity_id: preparation.id.toString(),
        from_status: 'GENERATED',
        to_status: 'EN_USO',
        performed_by: userId,
        notes: `Mezcla generada. Folio: ${folio}, Fórmula: ${formula.name}`,
        metadata: { preparation_id: preparation.id, total_quantity: totalQuantity }
      }, { transaction });

      // 7. Crear el Lote correspondiente a la Mezcla
      // Para que la Extrusora pueda consumir esta mezcla en su Corrida de Producción.
      const lote = await Lote.create({
        material_id: 1, // Generic mix material id for now or could be targeted from formula
        folio,
        user_id: userId,
        qr_id: destQr.id,
        location_id: null,
        initial_amount: totalQuantity,
        available_amount: totalQuantity,
        notes: 'Lote de Mezcla generado en Extrusión',
        is_active: true
      }, { transaction });

      return preparation;
    });
  }

  async getFormulas() {
    return ProcessFormula.findAll({
      where: { is_active: true }
    });
  }

  async getFormulaDetails(id) {
    const formula = await ProcessFormula.findByPk(id);
    if (!formula) throw new Error('Fórmula no encontrada.');

    const items = await ProcessFormulaItem.findAll({ where: { formula_id: id } });
    
    // As a workaround since relations might not be fully mapped to Material in index.js for ProcessFormulaItem
    const { Material } = require('../../database/models');
    
    const detailedItems = [];
    for (const item of items) {
       const mat = await Material.findByPk(item.material_id);
       detailedItems.push({
         ...item.toJSON(),
         material_name: mat ? mat.name : 'Desconocido'
       });
    }

    return {
      ...formula.toJSON(),
      items: detailedItems
    };
  }

  async createMixRequest(payload, userId) {
    const { formula_id, to_area_id, quantity, notes } = payload;
    
    // validate formula
    const formula = await ProcessFormula.findByPk(formula_id);
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
      unit: formula.base_unit_id === 1 ? 'Kg' : 'Unidad',
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
    const { Area } = require('../../database/models');
    
    const detailed = [];
    for (const prep of preparations) {
      const form = await ProcessFormula.findByPk(prep.formula_id);
      const area = await Area.findByPk(prep.to_area_id);
      
      detailed.push({
        ...prep.toJSON(),
        formula_name: form ? form.name : 'Unknown Formula',
        extruder_name: area ? area.name : 'Unknown Extruder'
      });
    }

    return detailed;
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

    const { ExtruderQueue, Formula, FormulaIngredient, Material, ExtrusionScrapLog } = require('../../database/models');

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
      if (![1, 3, 4, 5].includes(machineId)) {
        const error = new Error('Máquina no válida. Las extrusoras disponibles son 1, 3, 4 y 5.');
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
   */
  async scanRackPti({ rack_qr, pti_material_id, quantity, mixture_qr, notes, userId }) {
    const pieces = Number(quantity);
    if (!pieces || pieces <= 0) {
      const error = new Error('La cantidad de piezas de PTI debe ser un valor mayor a cero.');
      error.statusCode = 400;
      throw error;
    }

    const ptiId = Number(pti_material_id);
    if (!ptiId) {
      const error = new Error('ID de tipo de PTI es obligatorio.');
      error.statusCode = 400;
      throw error;
    }

    const { PtiRack, Material, Formula, FormulaIngredient, ExtruderQueue } = require('../../database/models');
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

      // 3. Regla 5: Racks Dinámicos (Condicionamiento)
      // Si ya tiene material, el sistema valida que el PTI coincida
      if (rack.status !== 'VACIO' && rack.current_pti_type_id) {
        if (rack.current_pti_type_id !== ptiId) {
          const conditionedName = currentPtiType?.name || `#${rack.current_pti_type_id}`;
          const error = new Error(`Incompatibilidad de Rack: El Rack ${rack.rack_code} está condicionado exclusivamente para el material PTI '${conditionedName}'. No se permite mezclar con PTI #${ptiId}.`);
          error.statusCode = 400;
          throw error;
        }
      } else {
        // Si está vacío, acepta el primer PTI escaneado y se condiciona
        rack.current_pti_type_id = ptiId;
      }

      // 4. Actualizar cantidad (Hook limpia condicionamiento si llega a 0 y actualiza status)
      rack.current_quantity = currentQty + pieces;
      await rack.save({ transaction: t });

      // 5. Regla 6: Backflushing - Cálculo de consumo en reversa usando ConsumptionService
      let backflushingResult = null;
      let formula = null;

      if (mixture_qr) {
        const queueItem = await ExtruderQueue.findOne({
          where: { consumption_order_qr_id: mixture_qr },
          include: [{
            model: Formula,
            as: 'formula',
            include: [{ model: FormulaIngredient, as: 'ingredients', include: [{ model: Material, as: 'material' }] }]
          }],
          transaction: t
        });

        if (queueItem && queueItem.formula) {
          formula = queueItem.formula;
        }
      }

      if (!formula) {
        formula = await Formula.findOne({
          include: [{ model: FormulaIngredient, as: 'ingredients', include: [{ model: Material, as: 'material' }] }],
          transaction: t
        });
      }

      if (formula) {
        backflushingResult = consumptionService.calculateBackflushing({
          formula,
          pieces,
          scrapWeightKg: 0
        });
      }

      return {
        message: `Ingreso registrado: ${pieces} piezas almacenadas en ${rack.rack_code}.`,
        rack: {
          id: rack.id,
          rack_code: rack.rack_code,
          qr_code: rack.qr_code,
          current_quantity: rack.current_quantity,
          max_capacity: rack.max_capacity,
          status: rack.status,
          current_pti_type_id: rack.current_pti_type_id
        },
        backflushing: backflushingResult
      };
    });
  }

  /**
   * Obtiene las colas de las 4 extrusoras (1, 3, 4, 5).
   */
  async getExtruderQueues() {
    const { ExtruderQueue, Formula, FormulaIngredient, Material } = require('../../database/models');

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

    const machines = [
      { id: 1, name: 'Extrusora 1', type: 'FIXED', description: 'Recetas fijas (Cinturón/Rafia)' },
      { id: 3, name: 'Extrusora 3', type: 'DYNAMIC', description: 'Recetas dinámicas' },
      { id: 4, name: 'Extrusora 4', type: 'DYNAMIC', description: 'Recetas dinámicas (PROHIBIDO PP-B)' },
      { id: 5, name: 'Extrusora 5', type: 'DYNAMIC', description: 'Recetas dinámicas' }
    ];

    return machines.map(m => {
      const machineQueues = queues.filter(q => q.extruder_id === m.id);
      const active = machineQueues.find(q => q.status === 'ACTIVA') || null;
      const paused = machineQueues.filter(q => q.status === 'PAUSADA');
      const waiting = machineQueues.filter(q => q.status === 'EN_ESPERA');

      return {
        machine: m,
        active,
        paused,
        waiting,
        total_in_queue: machineQueues.length
      };
    });
  }

  /**
   * Encola una mezcla en una extrusora validando restricciones de máquina.
   */
  async enqueueMix({ extruder_id, consumption_order_qr_id, formula_id, priority = 1, notes }) {
    const machineId = Number(extruder_id);
    if (![1, 3, 4, 5].includes(machineId)) {
      const error = new Error('Máquina no válida. Las extrusoras disponibles son 1, 3, 4 y 5.');
      error.statusCode = 400;
      throw error;
    }

    const { ExtruderQueue, Formula, FormulaIngredient, Material } = require('../../database/models');

    const formula = await Formula.findByPk(formula_id, {
      include: [{ model: FormulaIngredient, as: 'ingredients', include: [{ model: Material, as: 'material' }] }]
    });

    if (!formula) {
      const error = new Error('Fórmula especificada no encontrada.');
      error.statusCode = 404;
      throw error;
    }

    // Regla 2: Extrusora 4 tiene prohibido POLIPROPILENO (B)
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

    const newQueue = await ExtruderQueue.create({
      extruder_id: machineId,
      consumption_order_qr_id,
      formula_id,
      priority: Number(priority) || 1,
      status: 'EN_ESPERA',
      notes
    });

    return newQueue;
  }

  /**
   * Obtiene todos los Racks de PTI con sus estados actuales.
   */
  async getPtiRacks() {
    const { PtiRack, Material } = require('../../database/models');
    return await PtiRack.findAll({
      include: [{ model: Material, as: 'currentPtiType' }],
      order: [['rack_code', 'ASC']]
    });
  }

  /**
   * Obtiene las fórmulas de extrusión con ingredientes y rendimientos teóricos.
   */
  async getExtrusionFormulas() {
    const { Formula, FormulaIngredient, Material } = require('../../database/models');
    return await Formula.findAll({
      where: { is_active: true },
      include: [{ model: FormulaIngredient, as: 'ingredients', include: [{ model: Material, as: 'material' }] }],
      order: [['name', 'ASC']]
    });
  }
}

module.exports = new ExtrusionService();

