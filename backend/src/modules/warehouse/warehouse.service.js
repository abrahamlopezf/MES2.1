const { Op } = require('sequelize');
const { sequelize, Inventory, Material, MaterialUnit, QrCode, QrEvent, User, OperationalArea, TraceabilityEvent } = require('../../database/models');
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
    include: [
      { model: MaterialUnit, as: 'unit' },
      { model: sequelize.models.MaterialFamily, as: 'family' }
    ],
  });

  if (!material) {
    throwHttpError('Material no encontrado.', 404);
  }

  if (!material.unit_id) {
    throwHttpError('El material no tiene una unidad de medida configurada.', 400);
  }

  // Execute in transaction
  const result = await sequelize.transaction(async (t) => {
    // Build tracking_code (e.g. ALM-[FAMILIA-ARTICULO]-[Hex])
    const qrPrefix = qr.qr_code.split('-')[0] || 'ALM';
    const qrSuffix = qr.qr_code.split('-')[1] || qr.qr_code;
    const materialCode = material.internal_code || 'UNKNOWN';
    const trackingCode = `${qrPrefix}-${materialCode}-${qrSuffix}`;

    // 3. Create Inventory
    const stockUnit = await Inventory.create(
      {
        qr_code_uuid: qr.uuid,
        qr_code_value: qr.qr_code,
        tracking_code: trackingCode,
        material_id: material.id,
        available_quantity: quantity,
        unit_id: material.unit_id,
        location,
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
          inventory_id: stockUnit.id,
          material_id: material.id,
          quantity,
          location,
          tracking_code: trackingCode,
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

  const result = await Inventory.findAndCountAll({
    where,
    include: [
      {
        model: Material,
        as: 'material',
        attributes: ['id', 'internal_code', 'name'],
      },
      {
        model: MaterialUnit,
        as: 'unit',
        attributes: ['id', 'code', 'name'],
      },
    ],
    order: [['received_at', 'DESC']],
    limit,
    offset,
  });

  const areas = await OperationalArea.findAll();
  const areaMap = {};
  areas.forEach(a => { areaMap[String(a.id)] = `${a.code} - ${a.name}`; });

  // Obtener los usuarios que realizaron la recepción
  const inventoryUuids = result.rows.map(r => r.uuid);
  const events = await TraceabilityEvent.findAll({
    where: {
      entity_type: 'INVENTORY',
      event_type: 'RECEPTION',
      entity_id: inventoryUuids
    },
    include: [{ model: User, as: 'performedByUser', attributes: ['id', 'first_name', 'last_name', 'email'] }]
  });

  const eventMap = {};
  events.forEach(e => {
    if (!eventMap[e.entity_id]) {
      eventMap[e.entity_id] = e.performedByUser;
    }
  });

  const items = result.rows.map(row => {
    const plain = row.get({ plain: true });
    if (areaMap[plain.location]) {
      plain.location = areaMap[plain.location];
    }
    
    // Add received_by information
    const user = eventMap[plain.uuid];
    if (user) {
      plain.received_by = `${user.first_name} ${user.last_name}`;
    } else {
      plain.received_by = 'Sistema / Desconocido';
    }

    return plain;
  });

  return {
    items,
    total: result.count,
    limit,
    offset,
  };
};

module.exports = {
  receiveMaterial,
  getInventory,
};
