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

module.exports = {
  getInventory,
  getMaterialLotes,
  disposeLotes,
  getLoteDetails
};
