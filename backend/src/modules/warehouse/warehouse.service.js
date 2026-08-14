const { Op } = require('sequelize');
const { sequelize, Inventory, Material, Lote, User, Ranking } = require('../../database/models');
const { throwHttpError } = require('../../shared/security/accessRules');
const inventoryDomainService = require('./inventoryDomain.service');

const getInventory = async (query = {}) => {
  const { material_id } = query;

  const where = {
    amount: { [Op.gt]: 0 }
  };
  if (material_id) where.material_id = material_id;

  const limit = Math.min(Number(query.limit) || 100, 300);
  const offset = Number(query.offset) || 0;

  const result = await Inventory.findAndCountAll({
    where,
    attributes: [
      'material_id',
      [sequelize.fn('SUM', sequelize.col('amount')), 'amount'],
      [sequelize.fn('MAX', sequelize.col('Inventory.updated_at')), 'updated_at']
    ],
    include: [
      {
        model: Material,
        as: 'material',
        attributes: ['id', 'internal_code', 'name'],
        include: [
          { model: Ranking, as: 'ranking', attributes: ['name', 'nomenclature'] }
        ]
      }
    ],
    group: ['material_id', 'material.id', 'material->ranking.id'],
    order: [[sequelize.fn('MAX', sequelize.col('Inventory.updated_at')), 'DESC']],
    limit,
    offset,
  });

  // Because of group by, count is an array of groups, so we need result.count.length
  const totalCount = Array.isArray(result.count) ? result.count.length : result.count;

  return {
    items: result.rows,
    total: totalCount,
    limit,
    offset,
  };
};

const getMaterialLotes = async (material_id) => {
  if (!material_id) {
    throwHttpError('Falta el material_id', 400);
  }

  const { User, Location } = require('../../database/models');
  const lotes = await Lote.findAll({
    where: { material_id },
    include: [
      { model: User, as: 'user', attributes: ['id', 'first_name', 'last_name'] },
      { model: Location, as: 'location', attributes: ['id', 'name', 'code'] }
    ],
    order: [['date_received', 'ASC']]
  });

  return lotes;
};

const disposeLotes = async (payload, currentUser) => {
  if (!payload.material_id || !payload.lote_ids || !payload.tipo_baja_id) {
    throwHttpError('Faltan datos obligatorios para la baja', 400);
  }

  return await sequelize.transaction(async (t) => {
    const result = await inventoryDomainService.disposeLotes({
      ...payload,
      user_id: currentUser.id
    }, t);

    // Registrar Movimiento de Inventario de la baja
    const { InventoryMovement, TraceabilityEvent } = require('../../database/models');
    await InventoryMovement.create({
      inventory_id: result.inventory.id,
      type: 'DISPOSE',
      quantity_change: -result.totalDisposed,
      performed_by: currentUser.id,
      notes: `Baja de ${result.totalDisposed}. Lotes afectados: ${payload.lote_ids.join(', ')}. Motivo ID: ${payload.tipo_baja_id}. Notas: ${payload.notes || ''}`
    }, { transaction: t });

    // Registrar Evento de Trazabilidad por cada Lote
    if (result.lotes && result.lotes.length > 0) {
      for (const lote of result.lotes) {
        if (lote.qr_id) {
          await TraceabilityEvent.create({
            qr_code_id: lote.qr_id,
            event_type: 'DISPOSE',
            entity_type: 'LOTE',
            entity_id: lote.id.toString(),
            performed_by: currentUser.id,
            notes: `Lote dado de baja. Motivo ID: ${payload.tipo_baja_id}. Notas: ${payload.notes || ''}`,
            metadata: { tipo_baja_id: payload.tipo_baja_id }
          }, { transaction: t });
        }
      }
    }

    return result;
  });
};

const getLoteDetails = async (id) => {
  const { Material, User, Location, QrCode, TraceabilityEvent } = require('../../database/models');
  
  const lote = await Lote.findByPk(id, {
    include: [
      { model: Material, as: 'material', attributes: ['id', 'internal_code', 'name'] },
      { model: User, as: 'user', attributes: ['id', 'first_name', 'last_name'] },
      { model: Location, as: 'location', attributes: ['id', 'name', 'code'] },
      { model: QrCode, as: 'qr_code', attributes: ['id', 'qr_code'] }
    ]
  });

  if (!lote) {
    throwHttpError('Lote no encontrado', 404);
  }

  // Get traceability events associated with this lote's QR
  let events = [];
  if (lote.qr_id) {
    events = await TraceabilityEvent.findAll({
      where: { qr_code_id: lote.qr_id },
      order: [['created_at', 'ASC']],
      include: [
        { model: User, as: 'user', attributes: ['id', 'first_name', 'last_name'] }
      ]
    });
  }

  return {
    lote,
    events
  };
};
const consumeMaterials = async (payload, currentUser) => {
  if (!payload.items || !payload.items.length) {
    throwHttpError('No hay materiales para consumir.', 400);
  }

  return await sequelize.transaction(async (t) => {
    const result = await inventoryDomainService.consumeMaterials({
      ...payload,
      user_id: currentUser.id
    }, t);

    // Registrar Eventos de Trazabilidad y Movimientos
    const { InventoryMovement, TraceabilityEvent } = require('../../database/models');
    
    // Un movimiento por cada item consumido
    for (const item of result.items) {
      // Find the inventory to get inventory_id
      const inventory = await Inventory.findOne({ where: { material_id: item.material_id }, transaction: t });
      
      if (inventory) {
        await InventoryMovement.create({
          inventory_id: inventory.id,
          type: 'CONSUMPTION',
          quantity_change: -item.quantity,
          performed_by: currentUser.id,
          notes: `Consumo de ${item.quantity}. Lote afectado: ${item.lote_id}. Orden: ${payload.order_number || 'N/A'}`
        }, { transaction: t });
      }

      if (item.qr_id) {
        await TraceabilityEvent.create({
          qr_code_id: item.qr_id,
          event_type: 'CONSUMO',
          entity_type: 'LOTE',
          entity_id: item.lote_id.toString(),
          performed_by: currentUser.id,
          notes: `Consumo de ${item.quantity}. Orden: ${payload.order_number || 'N/A'}`,
          metadata: { order_number: payload.order_number, quantity: item.quantity, consumption_id: result.consumption.id }
        }, { transaction: t });
      }
    }

    return result;
  });
};

const changeLocation = async (payload, currentUser) => {
  if (!payload.lote_id || !payload.new_location_id) {
    throwHttpError('Faltan datos para el cambio de localidad.', 400);
  }

  return await sequelize.transaction(async (t) => {
    const { Location, TraceabilityEvent } = require('../../database/models');
    
    // Obtener localidad anterior para el log (opcional pero útil)
    const loteActual = await Lote.findByPk(payload.lote_id, { transaction: t });
    const oldLocationId = loteActual ? loteActual.location_id : null;

    const result = await inventoryDomainService.changeLocation(payload, t);

    const newLocation = await Location.findByPk(payload.new_location_id, { transaction: t });
    const locationStr = newLocation ? `${newLocation.name} (${newLocation.code})` : `ID ${payload.new_location_id}`;

    if (result.lote.qr_id) {
      await TraceabilityEvent.create({
        qr_code_id: result.lote.qr_id,
        event_type: 'CAMBIO_LOCALIDAD',
        entity_type: 'LOTE',
        entity_id: result.lote.id.toString(),
        performed_by: currentUser.id,
        notes: `Localidad actualizada a: ${locationStr}`,
        metadata: { old_location_id: oldLocationId, new_location_id: payload.new_location_id }
      }, { transaction: t });
    }

    return result;
  });
};
module.exports = {
  getInventory,
  getMaterialLotes,
  disposeLotes,
  consumeMaterials,
  changeLocation,
  getLoteDetails
};
