const { Op } = require('sequelize');

const {
  sequelize,
  Material,
  MaterialLot,
  MaterialStock,
  MaterialStockMovement,
  TraceableItem,
  QrCode,
  QrEvent,
  AuditLog,
} = require('../../database/models');

const { throwHttpError } = require('../../shared/security/accessRules');
const qrCodesService = require('../qrcodes/qrcodes.service');
const { QR_STATUS, QR_EVENT_TYPE, QR_ENTITY_TYPE } = require('../qrcodes/qr.constants');
const { MATERIAL_LOT_STATUS, MATERIAL_MOVEMENT_TYPE, MATERIAL_MOVEMENT_SOURCE } = require('./materialInventory.constants');
const { TRACEABLE_ITEM_TYPE, TRACEABLE_ITEM_STATUS } = require('../traceability/traceability.constants');

/**
 * Registra la recepción de materia prima utilizando un código QR virgen.
 */
const receiveMaterial = async (payload, currentUser) => {
  return sequelize.transaction(async (transaction) => {
    // 1. Validar existencia del Material
    const material = await Material.findOne({
      where: {
        id: payload.material_id,
        is_active: true,
      },
      transaction,
    });

    if (!material) {
      throwHttpError('El material especificado no existe o está inactivo.', 404);
    }

    // 2. Validar que el QR es utilizable mediante el servicio de QR
    // Pasamos require_available = true para asegurar que es un QR virgen asignado a un área.
    const { qr } = await qrCodesService.validateQrForUse(
      {
        qr_code: payload.qr_code,
        require_available: true,
      },
      currentUser
    );

    // Recuperar la instancia del modelo QrCode dentro de la misma transacción para modificarla
    const qrCodeRecord = await QrCode.findByPk(qr.id, { transaction });
    if (!qrCodeRecord) {
      throwHttpError('No se pudo recuperar el registro del código QR.', 500);
    }

    const currentAreaId = qrCodeRecord.current_area_id;

    // 3. Generar Folio Interno para el Lote
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const internalFolio = `LOT-${datePart}-${randomPart}`;

    // 4. Crear el Lote de Material (MaterialLot)
    const newLot = await MaterialLot.create(
      {
        material_id: material.id,
        internal_folio: internalFolio,
        supplier_lot: payload.supplier_lot || null,
        supplier_reference: payload.supplier_reference || null,
        received_quantity: payload.quantity,
        current_quantity: payload.quantity,
        unit: material.default_unit,
        status: MATERIAL_LOT_STATUS.DISPONIBLE,
        location: payload.location || null,
        qr_code: payload.qr_code,
        notes: payload.notes || null,
        created_by: currentUser.id,
      },
      { transaction }
    );

    // 5. Actualizar o Crear Stock General (MaterialStock)
    let materialStock = await MaterialStock.findOne({
      where: { material_id: material.id },
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    let balanceBefore = 0;
    if (materialStock) {
      balanceBefore = Number(materialStock.current_quantity);
      await materialStock.update(
        {
          current_quantity: Number(materialStock.current_quantity) + Number(payload.quantity),
          available_quantity: Number(materialStock.available_quantity) + Number(payload.quantity),
          updated_by: currentUser.id,
        },
        { transaction }
      );
    } else {
      materialStock = await MaterialStock.create(
        {
          material_id: material.id,
          current_quantity: payload.quantity,
          available_quantity: payload.quantity,
          default_unit: material.default_unit,
          created_by: currentUser.id,
        },
        { transaction }
      );
    }

    const balanceAfter = balanceBefore + Number(payload.quantity);

    // 6. Registrar el Movimiento (MaterialStockMovement)
    await MaterialStockMovement.create(
      {
        material_id: material.id,
        material_lot_id: newLot.id,
        movement_type: MATERIAL_MOVEMENT_TYPE.ENTRADA,
        source: MATERIAL_MOVEMENT_SOURCE.RECEPCION,
        quantity: payload.quantity,
        unit: material.default_unit,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        notes: payload.notes || null,
        created_by: currentUser.id,
      },
      { transaction }
    );

    // 7. Integrar con el Motor Global de Trazabilidad (TraceableItem)
    await TraceableItem.create(
      {
        qr_code_id: qrCodeRecord.id,
        item_type: TRACEABLE_ITEM_TYPE.RAW_MATERIAL_LOT,
        material_id: material.id,
        origin_area_id: currentAreaId,
        current_area_id: currentAreaId,
        quantity_initial: payload.quantity,
        quantity_current: payload.quantity,
        unit: material.default_unit,
        status: TRACEABLE_ITEM_STATUS.DISPONIBLE,
        supplier_lot: payload.supplier_lot || null,
        supplier_reference: payload.supplier_reference || null,
        location: payload.location || null,
        created_by: currentUser.id,
      },
      { transaction }
    );

    // 8. Actualizar el estado del QR a EN_USO y vincularlo
    await qrCodeRecord.update(
      {
        status: QR_STATUS.EN_USO,
        entity_type: QR_ENTITY_TYPE.WAREHOUSE_RECEIPT,
        entity_id: newLot.id,
        used_by: currentUser.id,
        used_at: new Date(),
      },
      { transaction }
    );

    // Registrar Evento del QR
    await QrEvent.create(
      {
        qr_code_id: qrCodeRecord.id,
        event_type: QR_EVENT_TYPE.USED,
        from_status: QR_STATUS.DISPONIBLE,
        to_status: QR_STATUS.EN_USO,
        from_area_id: currentAreaId,
        to_area_id: currentAreaId,
        performed_by: currentUser.id,
        description: `QR utilizado para recepción de materia prima (${material.code})`,
        metadata: {
          material_id: material.id,
          lot_id: newLot.id,
          quantity: payload.quantity,
        },
      },
      { transaction }
    );

    // 9. Registrar Auditoría
    await AuditLog.create(
      {
        user_id: currentUser.id,
        module: 'INVENTORY',
        action: 'RECEIVE_MATERIAL',
        description: 'Recepción de material en almacén',
        entity_type: 'MaterialLot',
        entity_id: newLot.id,
        ip_address: currentUser.ip_address || '127.0.0.1',
        user_agent: currentUser.user_agent || 'Unknown',
        details: {
          material_id: material.id,
          qr_code: payload.qr_code,
          quantity: payload.quantity,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
        },
      },
      { transaction }
    );

    // Devolver Lote creado
    return MaterialLot.findByPk(newLot.id, {
      include: [
        { model: Material, as: 'material' },
      ],
      transaction,
    });
  });
};

module.exports = {
  receiveMaterial,
};
