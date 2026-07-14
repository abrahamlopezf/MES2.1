const { Op } = require('sequelize');
const {
  sequelize,
  ProcessFormula,
  ProcessPreparation,
  ProcessPreparationInput,
  TraceableItem,
  TraceabilityMovement,
  TraceabilityLink,
  QrCode,
  QrEvent,
  AuditLog,
  MaterialStock,
  MaterialStockMovement,
  MaterialLot,
} = require('../../database/models');

const { throwHttpError } = require('../../shared/security/accessRules');
const qrCodesService = require('../qrcodes/qrcodes.service');
const { QR_STATUS, QR_EVENT_TYPE } = require('../qrcodes/qr.constants');
const { TRACEABLE_ITEM_TYPE, TRACEABLE_ITEM_STATUS, TRACEABILITY_MOVEMENT_TYPE, TRACEABILITY_LINK_TYPE } = require('../traceability/traceability.constants');
const { MATERIAL_MOVEMENT_TYPE, MATERIAL_MOVEMENT_SOURCE, MATERIAL_LOT_STATUS } = require('../materialInventory/materialInventory.constants');

const createPreparation = async (payload, currentUser) => {
  return sequelize.transaction(async (transaction) => {
    // 1. Validar Fórmula
    const formula = await ProcessFormula.findOne({
      where: { id: payload.formula_id, is_active: true },
      transaction,
    });
    if (!formula) throwHttpError('La fórmula especificada no existe o está inactiva.', 404);

    // 2. Validar QR de destino (Virgen)
    const { qr: destQr } = await qrCodesService.validateQrForUse({
      qr_code: payload.destination_qr_code,
      require_available: true,
    }, currentUser);

    const destQrRecord = await QrCode.findByPk(destQr.id, { transaction });
    if (!destQrRecord) throwHttpError('Error al recuperar QR de destino.', 500);

    // 3. Generar Folio
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const folio = `PREP-${datePart}-${randomPart}`;

    // Variables acumuladoras
    let totalQuantity = 0;
    const now = new Date();
    const createdInputs = [];
    const sourceTraceableItems = [];

    // 4. Crear cabecera de Preparación (se actualizan totales al final, pero necesitamos el ID)
    const preparation = await ProcessPreparation.create({
      folio,
      formula_id: formula.id,
      from_area_id: payload.from_area_id,
      to_area_id: payload.to_area_id,
      destination_qr_code_id: destQrRecord.id,
      target_intermediate_material_id: payload.target_intermediate_material_id || formula.target_intermediate_material_id || null,
      total_quantity: 0, // Se actualizará después
      unit: 'KG', // Asumiremos KG para la mezcla, podría venir del payload
      status: 'TRANSFERIDA',
      notes: payload.notes || null,
      prepared_by: currentUser.id,
      prepared_at: now,
    }, { transaction });

    // 5. Procesar Inputs (Materia Prima)
    for (const input of payload.inputs) {
      // Encontrar QR de entrada
      const sourceQr = await QrCode.findOne({
        where: { qr_code: input.qr_code, is_active: true },
        transaction,
      });
      if (!sourceQr) throwHttpError(`QR de entrada ${input.qr_code} no encontrado o inactivo.`, 404);

      // Encontrar TraceableItem bloqueando fila
      const sourceTraceable = await TraceableItem.findOne({
        where: { qr_code_id: sourceQr.id },
        lock: transaction.LOCK.UPDATE,
        transaction,
      });
      if (!sourceTraceable) throwHttpError(`No hay inventario trazable para el QR ${input.qr_code}.`, 404);

      if (Number(sourceTraceable.quantity_current) < Number(input.quantity)) {
        throwHttpError(`Saldo insuficiente en QR ${input.qr_code}. Saldo actual: ${sourceTraceable.quantity_current}.`, 400);
      }

      const balanceBefore = Number(sourceTraceable.quantity_current);
      const balanceAfter = balanceBefore - Number(input.quantity);
      totalQuantity += Number(input.quantity);

      // Actualizar TraceableItem
      await sourceTraceable.update({
        quantity_current: balanceAfter,
        status: balanceAfter === 0 ? TRACEABLE_ITEM_STATUS.CONSUMIDO : sourceTraceable.status,
        updated_by: currentUser.id,
      }, { transaction });

      sourceTraceableItems.push(sourceTraceable);

      // Crear Input
      const prepInput = await ProcessPreparationInput.create({
        preparation_id: preparation.id,
        formula_item_id: input.formula_item_id || null,
        source_traceable_item_id: sourceTraceable.id,
        source_qr_code_id: sourceQr.id,
        material_id: sourceTraceable.material_id, // Debe existir en RAW_MATERIAL
        quantity: input.quantity,
        unit: sourceTraceable.unit,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
      }, { transaction });
      createdInputs.push(prepInput);

      // Descontar de MaterialStock general
      const materialStock = await MaterialStock.findOne({
        where: { material_id: sourceTraceable.material_id },
        lock: transaction.LOCK.UPDATE,
        transaction,
      });
      if (materialStock) {
        const stockBalanceBefore = Number(materialStock.total_quantity);
        const stockBalanceAfter = stockBalanceBefore - Number(input.quantity);
        await materialStock.update({
          total_quantity: stockBalanceAfter,
          updated_by: currentUser.id,
        }, { transaction });

        // Encontrar Lote de Material si existe
        const materialLot = await MaterialLot.findOne({
          where: { qr_code: input.qr_code },
          lock: transaction.LOCK.UPDATE,
          transaction,
        });

        let lotId = null;
        if (materialLot) {
          lotId = materialLot.id;
          const lotBalanceAfter = Number(materialLot.current_quantity) - Number(input.quantity);
          await materialLot.update({
            current_quantity: lotBalanceAfter,
            status: lotBalanceAfter === 0 ? MATERIAL_LOT_STATUS.CONSUMIDO : materialLot.status,
            updated_by: currentUser.id,
          }, { transaction });
        }

        await MaterialStockMovement.create({
          material_id: sourceTraceable.material_id,
          material_lot_id: lotId,
          movement_type: MATERIAL_MOVEMENT_TYPE.SALIDA_PROCESO,
          source: MATERIAL_MOVEMENT_SOURCE.PROCESO,
          quantity: input.quantity,
          unit: sourceTraceable.unit,
          balance_before: stockBalanceBefore,
          balance_after: stockBalanceAfter,
          notes: `Consumo para preparación ${folio}`,
          created_by: currentUser.id,
        }, { transaction });
      }

      // Trazabilidad Movimiento
      await TraceabilityMovement.create({
        traceable_item_id: sourceTraceable.id,
        qr_code_id: sourceQr.id,
        movement_type: TRACEABILITY_MOVEMENT_TYPE.CONSUMO_PROCESO,
        quantity: input.quantity,
        unit: sourceTraceable.unit,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        from_area_id: payload.from_area_id,
        to_area_id: payload.to_area_id,
        reference_folio: folio,
        performed_by: currentUser.id,
        notes: 'Consumo parcial/total para mezcla',
      }, { transaction });

      // Si se consumió totalmente, marcar QR como finalizado
      if (balanceAfter === 0) {
        await sourceQr.update({ status: QR_STATUS.FINALIZADO }, { transaction });
        await QrEvent.create({
          qr_code_id: sourceQr.id,
          event_type: QR_EVENT_TYPE.FINALIZED,
          from_status: sourceQr.status,
          to_status: QR_STATUS.FINALIZADO,
          from_area_id: payload.from_area_id,
          to_area_id: payload.from_area_id,
          performed_by: currentUser.id,
          description: 'Código QR finalizado por consumo total de material.',
        }, { transaction });
      }
    }

    // 6. Actualizar Totales en Preparation
    await preparation.update({
      total_quantity: totalQuantity,
    }, { transaction });

    // 7. Crear el TraceableItem de destino (PREPARED_MIX)
    const newMixTraceable = await TraceableItem.create({
      qr_code_id: destQrRecord.id,
      item_type: TRACEABLE_ITEM_TYPE.PREPARED_MIX,
      origin_area_id: payload.to_area_id,
      current_area_id: payload.to_area_id,
      quantity_initial: totalQuantity,
      quantity_current: totalQuantity,
      unit: 'KG', // Unit de la mezcla
      status: TRACEABLE_ITEM_STATUS.DISPONIBLE,
      reference_folio: folio,
      created_by: currentUser.id,
    }, { transaction });

    // 8. Crear Enlaces de Trazabilidad (Genética: Padre -> Hijo)
    for (const input of createdInputs) {
      await TraceabilityLink.create({
        link_type: TRACEABILITY_LINK_TYPE.PREPARACION_FORMULA,
        parent_traceable_item_id: input.source_traceable_item_id,
        parent_qr_code_id: input.source_qr_code_id,
        child_traceable_item_id: newMixTraceable.id,
        child_qr_code_id: destQrRecord.id,
        process_area_id: payload.to_area_id,
        quantity_used: input.quantity,
        quantity_generated: totalQuantity,
        unit: input.unit,
        reference_folio: folio,
        created_by: currentUser.id,
      }, { transaction });
    }

    // 9. Actualizar QR Destino
    await destQrRecord.update({
      status: QR_STATUS.EN_USO,
      entity_type: 'ProcessPreparation',
      entity_id: preparation.id,
      used_by: currentUser.id,
      used_at: now,
    }, { transaction });

    await QrEvent.create({
      qr_code_id: destQrRecord.id,
      event_type: QR_EVENT_TYPE.USED,
      from_status: QR_STATUS.DISPONIBLE,
      to_status: QR_STATUS.EN_USO,
      from_area_id: destQrRecord.current_area_id,
      to_area_id: payload.to_area_id,
      performed_by: currentUser.id,
      description: `Generación de mezcla ${folio} a partir de fórmula ${formula.code}`,
      metadata: { preparation_id: preparation.id },
    }, { transaction });

    // Enlazar al modelo Preparation
    await preparation.update({
      destination_traceable_item_id: newMixTraceable.id,
    }, { transaction });

    // 10. Auditoría
    await AuditLog.create({
      user_id: currentUser.id,
      module: 'PREPARATION',
      description: 'Preparación de mezcla',
      action: 'PROCESS_PREPARATION',
      entity_type: 'ProcessPreparation',
      entity_id: preparation.id,
      ip_address: currentUser.ip_address || '127.0.0.1',
      user_agent: currentUser.user_agent || 'Unknown',
      details: {
        folio,
        formula_id: formula.id,
        destination_qr: payload.destination_qr_code,
        total_quantity: totalQuantity,
        inputs_count: createdInputs.length,
      },
    }, { transaction });

    // Retornar resultado
    return ProcessPreparation.findByPk(preparation.id, {
      include: [
        { model: ProcessPreparationInput, as: 'inputs' },
      ],
      transaction,
    });
  });
};

module.exports = {
  createPreparation,
};
