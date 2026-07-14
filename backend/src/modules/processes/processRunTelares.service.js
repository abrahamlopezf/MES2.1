const { Op } = require('sequelize');
const {
  sequelize,
  ProcessRun,
  ProcessRunInput,
  ProcessRunOutput,
  TraceableItem,
  TraceabilityMovement,
  TraceabilityLink,
  QrCode,
  QrEvent,
  StorageRack,
  IntermediateStock,
  IntermediateStockMovement,
  IntermediateMaterial,
  AuditLog,
} = require('../../database/models');

const { throwHttpError } = require('../../shared/security/accessRules');
const { TRACEABLE_ITEM_STATUS, TRACEABLE_ITEM_TYPE, TRACEABILITY_MOVEMENT_TYPE, TRACEABILITY_LINK_TYPE } = require('../traceability/traceability.constants');
const { QR_STATUS, QR_EVENT_TYPE } = require('../qrcodes/qr.constants');
const qrCodesService = require('../qrcodes/qrcodes.service');

const startTelares = async (payload, currentUser) => {
  return sequelize.transaction(async (transaction) => {
    // Generar Folio
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const folio = `TEL-${datePart}-${randomPart}`;

    // Obtener área del usuario o requerirla en payload
    const processAreaId = currentUser.area_id;
    if (!processAreaId) throwHttpError('El usuario no tiene un área asignada para iniciar el telar.', 400);

    const processRun = await ProcessRun.create({
      folio,
      process_area_id: processAreaId,
      station_id: payload.station_id,
      status: 'EN_PROCESO',
      started_by: currentUser.id,
      started_at: new Date(),
      notes: payload.notes || null,
      metadata: {
        target_material_id: payload.target_material_id,
        length_meters: payload.length_meters || null,
        machine_type: 'TELAR',
      },
    }, { transaction });

    await AuditLog.create({
      user_id: currentUser.id,
      module: 'TELARES',
      description: 'Inicio de corrida de telares',
      action: 'START_TELARES_RUN',
      entity_type: 'ProcessRun',
      entity_id: processRun.id,
      ip_address: currentUser.ip_address || '127.0.0.1',
      user_agent: currentUser.user_agent || 'Unknown',
      details: { folio, station_id: payload.station_id },
    }, { transaction });

    return processRun;
  });
};

const registerInput = async (processRunId, payload, currentUser) => {
  return sequelize.transaction(async (transaction) => {
    const processRun = await ProcessRun.findByPk(processRunId, { transaction });
    if (!processRun) throwHttpError('Corrida de telar no encontrada.', 404);
    if (processRun.status !== 'EN_PROCESO') throwHttpError('La corrida ya no está en proceso.', 400);

    const rackQr = await QrCode.findOne({
      where: { qr_code: payload.rack_qr_code, is_active: true },
      transaction,
    });
    if (!rackQr) throwHttpError(`Rack QR ${payload.rack_qr_code} no encontrado.`, 404);

    const rack = await StorageRack.findOne({
      where: { qr_code_id: rackQr.id },
      transaction,
    });
    if (!rack) throwHttpError('El QR escaneado no es de un Rack válido.', 404);

    // Buscar inventario de carretes en el Rack (asumimos el primer material intermedio o requerimos pasarlo)
    const rackStock = await IntermediateStock.findOne({
      where: { rack_id: rack.id },
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    if (!rackStock || Number(rackStock.quantity_primary) < Number(payload.quantity_spools)) {
      throwHttpError(`Inventario insuficiente en el Rack. Disponible: ${rackStock ? rackStock.quantity_primary : 0}`, 400);
    }

    const stockBalanceBefore = Number(rackStock.quantity_primary);
    const stockBalanceAfter = stockBalanceBefore - Number(payload.quantity_spools);

    await rackStock.update({
      quantity_primary: stockBalanceAfter,
      last_movement_at: new Date(),
    }, { transaction });

    // MOTOR FIFO: Distribuir consumo entre los lotes de extrusión guardados en ProcessRunOutput
    const rackOutputs = await ProcessRunOutput.findAll({
      where: {
        rack_id: rack.id,
        status: { [Op.in]: ['REGISTRADO', 'EN_USO'] },
      },
      order: [['produced_at', 'ASC']],
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    let remainingToConsume = Number(payload.quantity_spools);
    let consumedBatches = [];

    for (let output of rackOutputs) {
      if (remainingToConsume <= 0) break;

      const metadata = output.metadata || {};
      const availableInOutput = metadata.quantity_remaining !== undefined 
        ? Number(metadata.quantity_remaining) 
        : Number(output.quantity_primary);

      if (availableInOutput <= 0) continue;

      const consumeAmount = Math.min(availableInOutput, remainingToConsume);
      
      // Actualizar metadata del output
      metadata.quantity_remaining = availableInOutput - consumeAmount;
      const newStatus = metadata.quantity_remaining === 0 ? 'CONSUMIDO' : 'EN_USO';

      await output.update({
        metadata,
        status: newStatus,
      }, { transaction });

      // Registrar Input en Telares con el rastro genético (source_traceable_item_id = Mezcla original)
      const inputRecord = await ProcessRunInput.create({
        process_run_id: processRun.id,
        traceable_item_id: output.source_traceable_item_id,
        qr_code_id: output.source_qr_code_id,
        input_type: 'CARRETE',
        quantity_planned: consumeAmount,
        quantity_used: consumeAmount,
        unit: 'CARRETE',
        balance_before: stockBalanceBefore, // Usamos balance del Rack como referencia
        balance_after: stockBalanceAfter,
        created_by: currentUser.id,
      }, { transaction });

      consumedBatches.push(inputRecord);
      remainingToConsume -= consumeAmount;
    }

    if (remainingToConsume > 0) {
      // Inconsistencia de datos: El rack dice tener X cantidad, pero el detalle FIFO dice tener menos.
      // Para no bloquear la operación en piso, descontaremos el sobrante forzando el registro 
      // (asumiremos trazabilidad perdida para el remanente, apuntando al último o dejándolo nulo)
      // Lo ideal en nivel Enterprise es requerir ajuste de inventario, por lo que lanzaremos error.
      throwHttpError(`Inconsistencia FIFO: Faltan registros de trazabilidad para descontar ${remainingToConsume} carretes del Rack. Solicite ajuste de inventario.`, 409);
    }

    // Registro del movimiento físico
    await IntermediateStockMovement.create({
      intermediate_stock_id: rackStock.id,
      intermediate_material_id: rackStock.intermediate_material_id,
      area_id: rackStock.area_id,
      rack_id: rack.id,
      movement_type: 'SALIDA_PRODUCCION',
      quantity_primary: payload.quantity_spools,
      primary_unit: 'CARRETE',
      balance_before_primary: stockBalanceBefore,
      balance_after_primary: stockBalanceAfter,
      reference_id: processRun.id,
      reference_type: 'ProcessRun',
      notes: payload.notes || 'Consumo en Telares',
      created_by: currentUser.id,
    }, { transaction });

    await AuditLog.create({
      user_id: currentUser.id,
      module: 'TELARES',
      description: 'Consumo de carretes en telares',
      action: 'TELARES_INPUT_CONSUMPTION',
      entity_type: 'ProcessRun',
      entity_id: processRun.id,
      ip_address: currentUser.ip_address || '127.0.0.1',
      details: { rack: payload.rack_qr_code, quantity: payload.quantity_spools },
    }, { transaction });

    return { success: true, consumed: payload.quantity_spools, batches_used: consumedBatches.length };
  });
};

const finishTelares = async (processRunId, payload, currentUser) => {
  return sequelize.transaction(async (transaction) => {
    const processRun = await ProcessRun.findByPk(processRunId, {
      include: [{ model: ProcessRunInput, as: 'inputs' }],
      transaction,
    });

    if (!processRun) throwHttpError('Corrida no encontrada.', 404);
    if (processRun.status !== 'EN_PROCESO') throwHttpError('La corrida ya fue cerrada.', 400);

    // Validar QR del Rollo
    const { qr: rollQr } = await qrCodesService.validateQrForUse({
      qr_code: payload.virgin_qr_code,
      require_available: true,
    }, currentUser);

    const destQrRecord = await QrCode.findByPk(rollQr.id, { transaction });
    if (!destQrRecord) throwHttpError('Error al recuperar QR de destino.', 500);

    // Obtener catálogo del rollo desde metadatos
    const targetMaterialId = processRun.metadata?.target_material_id;

    // Crear el elemento trazable del Rollo
    const rollTraceable = await TraceableItem.create({
      qr_code_id: destQrRecord.id,
      item_type: TRACEABLE_ITEM_TYPE.INTERMEDIATE_PRODUCT,
      material_id: targetMaterialId, // Podría ser null si es un catálogo mixto, lo dejamos mapeado
      origin_area_id: processRun.process_area_id,
      current_area_id: processRun.process_area_id,
      quantity_initial: payload.quantity_produced,
      quantity_current: payload.quantity_produced,
      unit: payload.unit,
      status: TRACEABLE_ITEM_STATUS.DISPONIBLE,
      reference_folio: processRun.folio,
      created_by: currentUser.id,
    }, { transaction });

    // Trazabilidad Genética (Extraer padres únicos de las entradas FIFO)
    const uniqueParents = [...new Set(processRun.inputs.map(input => input.traceable_item_id))];
    for (const parentTraceableId of uniqueParents) {
      if (!parentTraceableId) continue;
      
      const parentInputs = processRun.inputs.filter(i => i.traceable_item_id === parentTraceableId);
      const totalUsedFromParent = parentInputs.reduce((sum, i) => sum + Number(i.quantity_used), 0);

      const parentTraceable = await TraceableItem.findByPk(parentTraceableId, { transaction });
      
      if (parentTraceable) {
        await TraceabilityLink.create({
          link_type: TRACEABILITY_LINK_TYPE.TRANSFORMACION,
          parent_traceable_item_id: parentTraceable.id,
          parent_qr_code_id: parentTraceable.qr_code_id,
          child_traceable_item_id: rollTraceable.id,
          child_qr_code_id: destQrRecord.id,
          process_area_id: processRun.process_area_id,
          quantity_used: totalUsedFromParent,
          quantity_generated: payload.length_meters || 0,
          unit: parentTraceable.unit,
          reference_folio: processRun.folio,
          created_by: currentUser.id,
        }, { transaction });
      }
    }

    // Actualizar estado QR y Corrida
    await destQrRecord.update({
      status: QR_STATUS.EN_USO,
      entity_type: 'ProcessRun',
      entity_id: processRun.id,
      used_by: currentUser.id,
      used_at: new Date(),
    }, { transaction });

    await QrEvent.create({
      qr_code_id: destQrRecord.id,
      event_type: QR_EVENT_TYPE.USED,
      from_status: QR_STATUS.DISPONIBLE,
      to_status: QR_STATUS.EN_USO,
      from_area_id: destQrRecord.current_area_id,
      to_area_id: destQrRecord.current_area_id,
      performed_by: currentUser.id,
      description: `Rollo generado en Telar (${processRun.folio})`,
    }, { transaction });

    await processRun.update({
      status: 'FINALIZADO',
      finished_by: currentUser.id,
      finished_at: new Date(),
      notes: payload.notes || processRun.notes,
    }, { transaction });

    await AuditLog.create({
      user_id: currentUser.id,
      module: 'TELARES',
      description: 'Finalización de corrida de telares',
      action: 'FINISH_TELARES_RUN',
      entity_type: 'ProcessRun',
      entity_id: processRun.id,
      ip_address: currentUser.ip_address || '127.0.0.1',
      details: { roll_qr: payload.virgin_qr_code, quantity: payload.quantity_produced },
    }, { transaction });

    return { success: true, processRun, rollTraceable };
  });
};

module.exports = {
  startTelares,
  registerInput,
  finishTelares,
};
