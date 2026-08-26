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
  const idsToProcess = payload.lote_ids ? payload.lote_ids : (payload.lote_id ? [payload.lote_id] : []);
  if (idsToProcess.length === 0 || !payload.new_location_id) {
    throwHttpError('Faltan datos para el cambio de localidad.', 400);
  }

  return await sequelize.transaction(async (t) => {
    const { Location, TraceabilityEvent, User, Role, Notification, Material } = require('../../database/models');
    
    // Obtener localidades anteriores para el log
    const lotesActuales = await Lote.findAll({ where: { id: idsToProcess }, include: [{ model: Material, as: 'material' }], transaction: t });
    const oldLocationsMap = {};
    let materialName = 'Desconocido';
    lotesActuales.forEach(l => {
      oldLocationsMap[l.id] = l.location_id;
      if (l.material && l.material.name) materialName = l.material.name;
    });

    const result = await inventoryDomainService.changeLocation(payload, t);

    const newLocation = await Location.findByPk(payload.new_location_id, { transaction: t });
    const locationStr = newLocation ? `${newLocation.name} (${newLocation.code})` : `ID ${payload.new_location_id}`;

    // Crear eventos de trazabilidad
    for (const lote of result.lotes) {
      if (lote.qr_id) {
        await TraceabilityEvent.create({
          qr_code_id: lote.qr_id,
          event_type: 'CAMBIO_LOCALIDAD',
          entity_type: 'LOTE',
          entity_id: lote.id.toString(),
          performed_by: currentUser.id,
          notes: `Localidad actualizada a: ${locationStr}`,
          metadata: { old_location_id: oldLocationsMap[lote.id], new_location_id: payload.new_location_id }
        }, { transaction: t });
      }
    }

    // Crear notificación para admin_alm
    const adminAlms = await User.findAll({
      include: [{ model: Role, as: 'role', where: { code: 'ADMIN_ALM' } }],
      transaction: t
    });

    if (adminAlms.length > 0) {
      const message = `${result.lotes.length} lote(s) del material "${materialName}" fueron movidos a la localidad ${locationStr}.`;
      const notifications = adminAlms.map(admin => ({
        recipient_id: admin.id,
        type: 'SYSTEM_INFO',
        title: 'Cambio de Localidad',
        message: message,
      }));
      await Notification.bulkCreate(notifications, { transaction: t });
    }

    return result;
  });
};

const getDashboardMetrics = async (user) => {
  const { sequelize, Inventory, Material, InventoryMovement, Lote } = require('../../database/models');

  // 1. Total Entradas (Número de lotes recibidos reales)
  const entradasCount = await Lote.count();

  // 2. Bajas y Consumos (Número de transacciones)
  const bajasCount = await InventoryMovement.count({
    where: {
      type: {
        [Op.in]: ['BAJA', 'DISPOSE', 'CONSUMPTION']
      }
    }
  });

  // 3. Merma / Scrap (Kilos totales)
  const mermaResult = await InventoryMovement.sum('quantity_change', {
    where: {
      type: {
        [Op.in]: ['MERMA', 'SCRAP']
      }
    }
  });

  // 4. Materiales con Stock Bajo
  const inventoryItems = await Inventory.findAll({
    attributes: [
      'material_id',
      [sequelize.fn('SUM', sequelize.col('amount')), 'total_amount']
    ],
    include: [
      {
        model: Material,
        as: 'material',
        attributes: ['minimum_stock'],
      }
    ],
    group: ['material_id', 'material.id']
  });

  let stockBajoCount = 0;
  for (const item of inventoryItems) {
    const total = parseFloat(item.getDataValue('total_amount') || 0);
    const minStock = parseFloat(item.material?.minimum_stock || 0);
    if (minStock > 0 && total <= minStock) {
      stockBajoCount++;
    }
  }

  // Gráficas adaptativas: Combinando fechas de Lotes (Entradas) y Movimientos (Salidas)
  const recentLotes = await Lote.findAll({
    attributes: ['date_received'],
    order: [['date_received', 'DESC']],
    limit: 2000,
    raw: true
  });

  const recentSalidas = await InventoryMovement.findAll({
    attributes: ['type', 'quantity_change', 'created_at'],
    where: {
      type: {
        [Op.in]: ['BAJA', 'DISPOSE', 'CONSUMPTION', 'MERMA', 'SCRAP']
      }
    },
    order: [['created_at', 'DESC']],
    limit: 2000,
    raw: true
  });

  const activeDaysMap = new Map();

  // Procesar Entradas (Lotes ingresados)
  for (const lote of recentLotes) {
    if (!lote.date_received) continue;
    const mDate = new Date(lote.date_received);
    if (isNaN(mDate.getTime())) continue;

    const dateStr = mDate.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
    const sortKey = mDate.toISOString().split('T')[0]; 

    if (!activeDaysMap.has(dateStr)) {
      activeDaysMap.set(dateStr, { sortKey, date: dateStr, entradas: 0, bajas: 0, merma: 0 });
    }
    activeDaysMap.get(dateStr).entradas += 1;
  }

  // Procesar Salidas y Mermas (Movimientos)
  for (const movement of recentSalidas) {
    if (!movement.created_at) continue;
    const mDate = new Date(movement.created_at);
    if (isNaN(mDate.getTime())) continue;

    const dateStr = mDate.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
    const sortKey = mDate.toISOString().split('T')[0]; 

    if (!activeDaysMap.has(dateStr)) {
      activeDaysMap.set(dateStr, { sortKey, date: dateStr, entradas: 0, bajas: 0, merma: 0 });
    }

    const entry = activeDaysMap.get(dateStr);
    const type = movement.type;
    
    if (['BAJA', 'DISPOSE', 'CONSUMPTION'].includes(type)) {
      entry.bajas += 1;
    } else if (['MERMA', 'SCRAP'].includes(type)) {
      entry.merma += Math.abs(parseFloat(movement.quantity_change) || 0);
    }
  }

  // Seleccionar los últimos 7 días de actividad, y ordenarlos de izquierda a derecha
  let chartDataArray = Array.from(activeDaysMap.values())
    .sort((a, b) => b.sortKey.localeCompare(a.sortKey)) // Descendente para tomar los mas recientes
    .slice(0, 7)
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey)); // Ascendente para la grafica

  if (chartDataArray.length === 0) {
    const today = new Date();
    const dateStr = today.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
    chartDataArray = [{ date: dateStr, entradas: 0, bajas: 0, merma: 0 }];
  }

  const chartData = chartDataArray.map(e => ({ date: e.date, entradas: e.entradas, bajas: e.bajas }));
  const mermaData = chartDataArray.map(e => ({ date: e.date, merma: parseFloat(e.merma.toFixed(2)) }));

  return {
    totalEntradas: entradasCount || 0,
    bajasRegistradas: bajasCount || 0, // Number of transactions for bajas/consumptions
    materialesStockBajo: stockBajoCount,
    mermaRegistrada: Math.abs(mermaResult || 0),
    chartData,
    mermaData
  };
};

const manualEntry = async (payload, currentUser) => {
  if (!payload.material_id || !payload.quantity || !payload.location_id) {
    throwHttpError('Faltan datos obligatorios para el ingreso manual (material, cantidad, localidad).', 400);
  }
  if (Number(payload.quantity) <= 0) {
    throwHttpError('La cantidad debe ser mayor a 0.', 400);
  }

  return await sequelize.transaction(async (t) => {
    const { InventoryMovement } = require('../../database/models');
    
    // 1. Crear el lote (virtual) e incrementar inventario
    const result = await inventoryDomainService.receiveLote({
      material_id: payload.material_id,
      user_id: currentUser.id,
      qr_id: null,
      location_id: payload.location_id,
      quantity: payload.quantity,
      notes: payload.notes || 'Ingreso manual'
    }, t);

    // 2. Registrar Movimiento de Inventario
    await InventoryMovement.create({
      inventory_id: result.inventory.id,
      type: 'MANUAL_ENTRY',
      quantity_change: payload.quantity,
      performed_by: currentUser.id,
      notes: payload.notes || 'Ingreso manual al sistema (Lote virtual)'
    }, { transaction: t });

    return result;
  });
};

module.exports = {
  getInventory,
  getMaterialLotes,
  disposeLotes,
  consumeMaterials,
  changeLocation,
  getLoteDetails,
  getDashboardMetrics,
  manualEntry
};
