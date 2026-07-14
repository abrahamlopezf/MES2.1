const { Op } = require('sequelize');
const {
  sequelize,
  ProcessRun,
  ProcessRunOutput,
  ProcessFormula,
  ProcessPreparation,
  TraceableItem,
  TraceabilityMovement,
  QrCode,
  StorageRack,
  IntermediateStock,
  IntermediateStockMovement,
  IntermediateMaterial,
  AuditLog,
} = require('../../database/models');

const { throwHttpError } = require('../../shared/security/accessRules');
const { TRACEABLE_ITEM_STATUS, TRACEABILITY_MOVEMENT_TYPE } = require('../traceability/traceability.constants');
const qrCodesService = require('../qrcodes/qrcodes.service');

const startRun = async (payload, currentUser) => {
  return sequelize.transaction(async (transaction) => {
    // 1. Validar el QR de la Mezcla
    const mixQr = await QrCode.findOne({
      where: { qr_code: payload.mix_qr_code, is_active: true },
      transaction,
    });
    if (!mixQr) throwHttpError(`El QR de mezcla ${payload.mix_qr_code} no existe o está inactivo.`, 404);

    const mixTraceable = await TraceableItem.findOne({
      where: { qr_code_id: mixQr.id },
      transaction,
    });
    if (!mixTraceable) throwHttpError(`No hay trazabilidad activa para el QR ${payload.mix_qr_code}.`, 404);

    if (mixTraceable.status === TRACEABLE_ITEM_STATUS.CONSUMIDO || mixTraceable.quantity_current <= 0) {
      throwHttpError(`La mezcla en el QR ${payload.mix_qr_code} ya fue consumida totalmente.`, 400);
    }

    // 2. Generar Folio
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const folio = `RUN-${datePart}-${randomPart}`;

    // 3. Crear el ProcessRun
    const processRun = await ProcessRun.create({
      folio,
      process_area_id: payload.process_area_id,
      station_id: payload.station_id || null,
      status: 'EN_PROCESO',
      source_traceable_item_id: mixTraceable.id,
      source_qr_code_id: mixQr.id,
      started_by: currentUser.id,
      started_at: new Date(),
      notes: payload.notes || null,
    }, { transaction });

    // Auditoría
    await AuditLog.create({
      user_id: currentUser.id,
      module: 'EXTRUSION',
      description: 'Inicio de corrida de extrusión',
      action: 'START_PROCESS_RUN',
      entity_type: 'ProcessRun',
      entity_id: processRun.id,
      ip_address: currentUser.ip_address || '127.0.0.1',
      user_agent: currentUser.user_agent || 'Unknown',
      details: {
        folio,
        mix_qr_code: payload.mix_qr_code,
      },
    }, { transaction });

    return processRun;
  });
};

const registerOutput = async (processRunId, payload, currentUser) => {
  return sequelize.transaction(async (transaction) => {
    const processRun = await ProcessRun.findByPk(processRunId, {
      include: [
        { model: TraceableItem, as: 'source_traceable_item' },
      ],
      transaction,
    });

    if (!processRun) throwHttpError('Producción (ProcessRun) no encontrada.', 404);
    if (processRun.status !== 'EN_PROCESO') throwHttpError('La producción ya no está en proceso.', 400);

    const mixTraceable = await TraceableItem.findByPk(processRun.source_traceable_item_id, {
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    if (mixTraceable.quantity_current <= 0) {
      throwHttpError('La mezcla asociada a esta producción ya se consumió por completo.', 400);
    }

    // Identificar Fórmula y Factor de Conversión
    // Primero, buscamos la preparación
    const preparation = await ProcessPreparation.findOne({
      where: { destination_traceable_item_id: mixTraceable.id },
      include: [{ model: ProcessFormula, as: 'formula' }],
      transaction,
    });

    let targetIntermediateMaterialId = preparation?.target_intermediate_material_id || preparation?.formula?.target_intermediate_material_id;
    if (!targetIntermediateMaterialId) {
      throwHttpError('No se pudo determinar el tipo de carrete (IntermediateMaterial) esperado para esta mezcla.', 400);
    }

    // Obtener factor de conversión (Asumimos 1 carrete = 0.5 KG por defecto si no existe metadata)
    let conversionFactorKgPerSpool = 0.5; 
    if (preparation?.formula?.metadata?.conversion_factor_kg_per_spool) {
      conversionFactorKgPerSpool = Number(preparation.formula.metadata.conversion_factor_kg_per_spool);
    }

    let consumedMixKg = payload.override_consumed_kg || (Number(payload.quantity_spools) * conversionFactorKgPerSpool);
    
    // Si la cantidad a consumir excede lo disponible, topamos al disponible (o lanzamos error). 
    // Toparemos al disponible para permitir liquidar el lote.
    if (consumedMixKg > mixTraceable.quantity_current) {
      consumedMixKg = mixTraceable.quantity_current;
    }

    const mixBalanceBefore = Number(mixTraceable.quantity_current);
    const mixBalanceAfter = mixBalanceBefore - consumedMixKg;

    // Actualizar mezcla
    await mixTraceable.update({
      quantity_current: mixBalanceAfter,
      status: mixBalanceAfter <= 0 ? TRACEABLE_ITEM_STATUS.CONSUMIDO : mixTraceable.status,
      updated_by: currentUser.id,
    }, { transaction });

    // Encontrar o crear Rack Stock
    const rackQr = await QrCode.findOne({
      where: { qr_code: payload.rack_qr_code, is_active: true },
      transaction,
    });
    if (!rackQr) throwHttpError(`Rack QR ${payload.rack_qr_code} no encontrado.`, 404);

    const rack = await StorageRack.findOne({
      where: { qr_code_id: rackQr.id },
      transaction,
    });
    if (!rack) throwHttpError(`El QR escaneado no pertenece a un Rack de almacenamiento válido.`, 404);

    let rackStock = await IntermediateStock.findOne({
      where: {
        rack_id: rack.id,
        intermediate_material_id: targetIntermediateMaterialId,
      },
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    let stockBalanceBefore = 0;
    if (!rackStock) {
      rackStock = await IntermediateStock.create({
        intermediate_material_id: targetIntermediateMaterialId,
        area_id: processRun.process_area_id,
        rack_id: rack.id,
        quantity_primary: payload.quantity_spools,
        primary_unit: 'CARRETE',
        status: 'OK',
        last_movement_at: new Date(),
      }, { transaction });
    } else {
      stockBalanceBefore = Number(rackStock.quantity_primary);
      const newStockQuantity = stockBalanceBefore + Number(payload.quantity_spools);
      
      if (rack.capacity_primary && newStockQuantity > Number(rack.capacity_primary)) {
        throwHttpError(`La entrada excedería la capacidad máxima del rack (${rack.capacity_primary} carretes).`, 400);
      }

      await rackStock.update({
        quantity_primary: newStockQuantity,
        last_movement_at: new Date(),
      }, { transaction });
    }

    const stockBalanceAfter = stockBalanceBefore + Number(payload.quantity_spools);

    // Registro de Output de Producción (Vincula específicamente qué corrida produjo qué carretes)
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const outputFolio = `PROD-${datePart}-${randomPart}`;

    const runOutput = await ProcessRunOutput.create({
      folio: outputFolio,
      process_run_id: processRun.id,
      source_traceable_item_id: mixTraceable.id,
      source_qr_code_id: mixTraceable.qr_code_id,
      intermediate_material_id: targetIntermediateMaterialId,
      rack_id: rack.id,
      intermediate_stock_id: rackStock.id,
      quantity_primary: payload.quantity_spools,
      primary_unit: 'CARRETE',
      produced_at: new Date(),
      status: 'REGISTRADO',
      notes: payload.notes || null,
      metadata: { quantity_remaining: payload.quantity_spools },
      created_by: currentUser.id,
    }, { transaction });

    // Movimientos financieros / Trazabilidad
    await TraceabilityMovement.create({
      traceable_item_id: mixTraceable.id,
      qr_code_id: mixTraceable.qr_code_id,
      movement_type: TRACEABILITY_MOVEMENT_TYPE.CONSUMO_PROCESO,
      quantity: consumedMixKg,
      unit: mixTraceable.unit,
      balance_before: mixBalanceBefore,
      balance_after: mixBalanceAfter,
      from_area_id: mixTraceable.current_area_id,
      to_area_id: mixTraceable.current_area_id,
      reference_folio: processRun.folio,
      performed_by: currentUser.id,
      notes: `Consumo automático por extrusión de ${payload.quantity_spools} carretes.`,
    }, { transaction });

    await IntermediateStockMovement.create({
      intermediate_stock_id: rackStock.id,
      intermediate_material_id: targetIntermediateMaterialId,
      area_id: processRun.process_area_id,
      rack_id: rack.id,
      movement_type: 'ENTRADA_PRODUCCION',
      quantity_primary: payload.quantity_spools,
      primary_unit: 'CARRETE',
      balance_before_primary: stockBalanceBefore,
      balance_after_primary: stockBalanceAfter,
      reference_id: runOutput.id,
      reference_type: 'ProcessRunOutput',
      notes: payload.notes || null,
      created_by: currentUser.id,
    }, { transaction });

    // Auditoría
    await AuditLog.create({
      user_id: currentUser.id,
      module: 'EXTRUSION',
      description: 'Inyección de producto al rack',
      action: 'PROCESS_RUN_OUTPUT',
      entity_type: 'ProcessRun',
      entity_id: processRun.id,
      ip_address: currentUser.ip_address || '127.0.0.1',
      user_agent: currentUser.user_agent || 'Unknown',
      details: {
        quantity_spools: payload.quantity_spools,
        consumed_mix_kg: consumedMixKg,
        rack_qr_code: payload.rack_qr_code,
      },
    }, { transaction });

    return {
      runOutput,
      mix_consumed_kg: consumedMixKg,
      mix_remaining_kg: mixBalanceAfter,
      rack_current_spools: stockBalanceAfter,
    };
  });
};

module.exports = {
  startRun,
  registerOutput,
};
