const { Op } = require('sequelize');
const { sequelize, StockUnit, Material, MaterialUnit, QrCode, QrEvent, User } = require('../../database/models');
const { throwHttpError } = require('../../shared/security/accessRules');
const { QR_STATUS, QR_EVENT_TYPE } = require('../qrcodes/qr.constants');

const receiveMaterial = async (data, currentUser) => {
  const { qr_code, material_id, quantity, location } = data;

  // 1. Verify QR exists and is UNASSIGNED
  const qr = await QrCode.findOne({
    where: { qr_code },
  });

  if (!qr) {
    throwHttpError('Código QR no encontrado.', 404);
  }

  if (qr.status !== QR_STATUS.UNASSIGNED) {
    throwHttpError(`El código QR no es válido para recepción. Estado actual: ${qr.status}`, 400);
  }

  // 2. Verify Material exists
  const material = await Material.findByPk(material_id, {
    include: [{ model: MaterialUnit, as: 'unit' }],
  });

  if (!material) {
    throwHttpError('Material no encontrado.', 404);
  }

  if (!material.unit_id) {
    throwHttpError('El material no tiene una unidad de medida configurada.', 400);
  }

  // Execute in transaction
  const result = await sequelize.transaction(async (t) => {
    // 3. Create StockUnit
    const stockUnit = await StockUnit.create(
      {
        qr_code_uuid: qr.uuid,
        qr_code_value: qr.qr_code,
        material_id: material.id,
        quantity,
        unit_id: material.unit_id,
        location,
        user_id: currentUser.id,
        status: 'AVAILABLE',
      },
      { transaction: t }
    );

    // 4. Update QR Code Status
    await qr.update(
      {
        status: QR_STATUS.ACTIVE,
        used_by: currentUser.id,
      },
      { transaction: t }
    );

    // 5. Create QrEvent
    await QrEvent.create(
      {
        qr_code_id: qr.id,
        event_type: QR_EVENT_TYPE.MATERIAL_RECEIVED,
        performed_by: currentUser.id,
        notes: `Recepción de material. Cantidad: ${quantity} ${material.unit ? material.unit.code : ''}. Ubicación: ${location}`,
        metadata: {
          stock_unit_id: stockUnit.id,
          material_id: material.id,
          quantity,
          location,
        },
      },
      { transaction: t }
    );

    return stockUnit;
  });

  return result;
};

const getInventory = async (query = {}, currentUser) => {
  const { search, material_id, location, status } = query;

  const where = {};
  if (material_id) where.material_id = material_id;
  if (location) where.location = { [Op.iLike]: `%${location}%` };
  if (status) where.status = status;

  if (search) {
    where.qr_code_value = { [Op.iLike]: `%${search}%` };
  }

  const limit = Math.min(Number(query.limit) || 100, 300);
  const offset = Number(query.offset) || 0;

  const result = await StockUnit.findAndCountAll({
    where,
    include: [
      {
        model: Material,
        as: 'material',
        attributes: ['id', 'code', 'name'],
      },
      {
        model: MaterialUnit,
        as: 'unit',
        attributes: ['id', 'code', 'name'],
      },
      {
        model: User,
        as: 'user',
        attributes: ['id', 'first_name', 'last_name'],
      },
    ],
    order: [['received_at', 'DESC']],
    limit,
    offset,
  });

  return {
    items: result.rows,
    total: result.count,
    limit,
    offset,
  };
};

module.exports = {
  receiveMaterial,
  getInventory,
};
