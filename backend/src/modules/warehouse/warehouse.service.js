const { Op } = require('sequelize');
const { sequelize, Inventory, Material, Lote, User, Ranking, MaterialUnit } = require('../../database/models');
const { throwHttpError } = require('../../shared/security/accessRules');
const inventoryDomainService = require('./inventoryDomain.service');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const parseUuidList = (raw) => String(raw || '')
  .split(',')
  .map(v => v.trim())
  .filter(v => UUID_REGEX.test(v));

const parseIntList = (raw) => String(raw || '')
  .split(',')
  .map(v => parseInt(v.trim(), 10))
  .filter(v => Number.isInteger(v) && v > 0);

/**
 * Construye condiciones sobre material_id a partir de filtros de catálogo
 * (etiquetas, familias, ranking). Los valores se sanitizan antes de usarse en subqueries.
 */
const applyMaterialCatalogFilters = (where, query = {}) => {
  const conditions = [];

  if (query.tag) {
    const tags = parseUuidList(query.tag);
    conditions.push(tags.length
      ? { [Op.in]: sequelize.literal(`(SELECT mt.material_id FROM material_tags mt JOIN tags t ON mt.tag_id = t.id WHERE t.uuid IN (${tags.map(t => `'${t}'`).join(',')}))`) }
      : { [Op.eq]: -1 });
  }

  if (query.family) {
    const families = parseUuidList(query.family);
    conditions.push(families.length
      ? { [Op.in]: sequelize.literal(`(SELECT m.id FROM materials m JOIN material_families f ON m.family_id = f.id WHERE f.uuid IN (${families.map(f => `'${f}'`).join(',')}))`) }
      : { [Op.eq]: -1 });
  }

  if (query.ranking) {
    const rankings = parseIntList(query.ranking);
    conditions.push(rankings.length
      ? { [Op.in]: sequelize.literal(`(SELECT m.id FROM materials m WHERE m.ranking_id IN (${rankings.join(',')}))`) }
      : { [Op.eq]: -1 });
  }

  if (!conditions.length) return;
  if (where.material_id !== undefined) conditions.unshift({ [Op.eq]: where.material_id });
  where.material_id = { [Op.and]: conditions };
};

const getInventory = async (query = {}) => {
  const { material_id } = query;

  const where = {
    amount: { [Op.gt]: 0 }
  };
  if (material_id) where.material_id = material_id;

  const limit = Math.min(Number(query.limit) || 100, 1000);
  const offset = Number(query.offset) || 0;

  applyMaterialCatalogFilters(where, query);

  if (query.search) {
    const sSafe = String(query.search).replace(/'/g, "''");
    const s = `%${sSafe}%`;
    where[Op.or] = [
      { '$material.name$': { [Op.iLike]: s } },
      { '$material.internal_code$': { [Op.iLike]: s } },
      { '$material.description$': { [Op.iLike]: s } },
      { material_id: { [Op.in]: sequelize.literal(`(SELECT material_id FROM lotes LEFT JOIN qr_codes ON lotes.qr_id = qr_codes.id WHERE lotes.folio ILIKE '${s}' OR qr_codes.qr_code ILIKE '${s}')`) } }
    ];
  }

  const result = await Inventory.findAndCountAll({
    where,
    attributes: [
      'material_id',
      [sequelize.fn('SUM', sequelize.col('amount')), 'amount'],
      [sequelize.fn('MAX', sequelize.col('Inventory.updated_at')), 'updated_at'],
      [sequelize.literal('(SELECT COALESCE(SUM(available_amount * unit_cost), 0) FROM lotes WHERE lotes.material_id = "Inventory"."material_id" AND lotes.is_active = true)'), 'total_value']
    ],
    include: [
      {
        model: Material,
        as: 'material',
        attributes: ['id', 'internal_code', 'name', 'description'],
        include: [
          { model: Ranking, as: 'ranking', attributes: ['name', 'nomenclature'] },
          { model: MaterialUnit, as: 'base_unit', attributes: ['code'] }
        ]
      }
    ],
    group: ['material_id', 'material.id', 'material.description', 'material->ranking.id', 'material->base_unit.id'],
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

const getAreaInventory = async (query = {}, currentUser) => {
  const isGlobalAdmin = ['SUPERADMIN', 'ADMIN_GENERAL', 'ADMIN_GRAL', 'ADMIN', 'ADMIN_ALM'].includes(currentUser.role?.code);

  if (!currentUser.area_id && !isGlobalAdmin) {
    throwHttpError('El usuario no tiene un área asignada para ver el inventario de área.', 400);
  }

  const { WipInventory, QrCode } = require('../../database/models');
  
  const where = {
    amount: { [Op.gt]: 0 }
  };

  if (!isGlobalAdmin || currentUser.area_id) {
    where.area_id = currentUser.area_id;
  }

  const limit = Math.min(Number(query.limit) || 100, 300);
  const offset = Number(query.offset) || 0;

  applyMaterialCatalogFilters(where, query);

  const result = await WipInventory.findAndCountAll({
    where,
    include: [
      {
        model: Material,
        as: 'material',
        attributes: ['id', 'internal_code', 'name', 'description'],
        include: [
          { model: Ranking, as: 'ranking', attributes: ['name', 'nomenclature'] },
          { model: MaterialUnit, as: 'base_unit', attributes: ['code'] }
        ]
      },
      {
        model: Lote,
        as: 'lote',
        attributes: ['id', 'folio', 'is_active', 'unit_cost']
      },
      {
        model: QrCode,
        as: 'qr_code',
        attributes: ['id', 'qr_code', 'status']
      }
    ],
    order: [['updated_at', 'DESC']],
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

const getMaterialLotes = async (material_id) => {
  if (!material_id) {
    throwHttpError('Falta el material_id', 400);
  }

  const { User, Location, Material, MaterialUnit, QrCode } = require('../../database/models');
  const lotes = await Lote.findAll({
    where: { material_id },
    include: [
      { model: User, as: 'user', attributes: ['id', 'first_name', 'last_name'] },
      { model: Location, as: 'location', attributes: ['id', 'name', 'code'] },
      { model: QrCode, as: 'qr_code', attributes: ['id', 'qr_code', 'uuid'] },
      { 
        model: Material, 
        as: 'material', 
        attributes: ['id', 'name'],
        include: [{ model: MaterialUnit, as: 'base_unit', attributes: ['code'] }]
      }
    ],
    order: [['date_received', 'DESC']]
  });

  return lotes;
};

const disposeLotes = async (payload, currentUser) => {
  if ((!payload.material_id || !payload.lote_ids) && (!payload.items || payload.items.length === 0)) {
    throwHttpError('Faltan datos obligatorios para la baja', 400);
  }
  if (!payload.tipo_baja_id) {
    throwHttpError('Falta el tipo de baja', 400);
  }

  return await sequelize.transaction(async (t) => {
    const result = await inventoryDomainService.disposeLotes({
      ...payload,
      user_id: currentUser.id
    }, t);

    // Obtener Tipo de Baja
    const { InventoryMovement, TraceabilityEvent, TipoBaja, Inventory } = require('../../database/models');
    
    let motivoName = 'Desconocido';
    let movementType = 'DISPOSE';
    const tipoBaja = await TipoBaja.findByPk(payload.tipo_baja_id);
    
    if (tipoBaja) {
      motivoName = tipoBaja.name;
      const lowerName = motivoName.toLowerCase();
      if (lowerName.includes('devoluci')) {
        movementType = 'DEVOLUCION';
      } else if (lowerName.includes('merma')) {
        movementType = 'MERMA';
      } else if (
        lowerName.includes('scrap') ||
        lowerName.includes('dañ') ||
        lowerName.includes('caduc') ||
        lowerName.includes('contamin') ||
        tipoBaja.id === 1 || // Material dañado
        tipoBaja.id === 3 || // Caducidad
        tipoBaja.id === 4    // Contaminación
      ) {
        movementType = 'SCRAP';
      } else {
        movementType = 'DISPOSE';
      }
    }
    
    const foliosAfectados = result.lotes ? result.lotes.map(l => l.folio).filter(Boolean).join(', ') : '';

    // Crear un movimiento por cada material descontado
    for (const [matId, qty] of Object.entries(result.materialDiscounts || {})) {
      const inventory = await Inventory.findOne({ where: { material_id: matId }, transaction: t });
      if (inventory) {
        const matCost = Number(result.materialCosts?.[matId] || 0);
        const unitCostAvg = qty > 0 ? (matCost / qty) : 0;
        await InventoryMovement.create({
          inventory_id: inventory.id,
          type: movementType,
          quantity_change: -qty,
          unit_cost: unitCostAvg,
          total_cost: matCost,
          performed_by: currentUser.id,
          notes: `Baja Global. Facturas afectadas: ${foliosAfectados}. Motivo: ${motivoName}. Notas: ${payload.notes || ''}`
        }, { transaction: t });
      }
    }

    // Registrar Evento de Trazabilidad por cada Lote y actualizar QR status si aplica
    if (result.lotes && result.lotes.length > 0) {
      const { QrCode, TraceabilityEvent } = require('../../database/models');
      for (const lote of result.lotes) {
        if (lote.qr_id) {
          const qty = result.disposedQuantities?.[lote.id] || 'N/A';
          const isTotal = !lote.is_active;
          
          if (isTotal) {
            await QrCode.update({ status: 'DISPOSED', is_active: false }, { where: { id: lote.qr_id }, transaction: t });
          }

          await TraceabilityEvent.create({
            qr_code_id: lote.qr_id,
            event_type: 'DISPOSE',
            entity_type: 'LOTE',
            entity_id: lote.id.toString(),
            performed_by: currentUser.id,
            notes: `Baja ${isTotal ? 'TOTAL' : 'PARCIAL'} de ${qty} unidades. Motivo: ${motivoName}. Notas: ${payload.notes || ''}`,
            metadata: { tipo_baja_id: payload.tipo_baja_id, quantity: qty, isTotal }
          }, { transaction: t });
        }
      }
    }

    const { notifyAdminsIfNonAdmin } = require('../notifications/notification.service');
    await notifyAdminsIfNonAdmin(
      currentUser,
      'Baja de Inventario Crítica',
      `Se registró una baja de inventario. Motivo: ${motivoName}. Folios afectados: ${foliosAfectados}.`,
      t
    );

    return result;
  });
};

const requestDisposeLotes = async (payload, currentUser) => {
  if ((!payload.material_id || !payload.lote_ids) && (!payload.items || payload.items.length === 0)) {
    throwHttpError('Faltan datos obligatorios para solicitar la baja', 400);
  }
  if (!payload.tipo_baja_id) {
    throwHttpError('Falta el tipo de baja', 400);
  }

  return await sequelize.transaction(async (t) => {
    return await inventoryDomainService.requestDisposeLotes(payload, currentUser, t);
  });
};

const getWasteRequest = async (requestId, currentUser) => {
  return await inventoryDomainService.getWasteRequest(requestId, currentUser);
};

const resolveWasteRequest = async (requestId, status, currentUser) => {
  if (!['APPROVED', 'REJECTED'].includes(status)) {
    throwHttpError('Estado inválido para resolución', 400);
  }

  return await sequelize.transaction(async (t) => {
    return await inventoryDomainService.resolveWasteRequest(requestId, status, currentUser, t);
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

  // Get consumption events associated with this lote
  const { MaterialConsumptionItem, MaterialConsumption } = require('../../database/models');
  const consumptions = await MaterialConsumption.findAll({
    include: [
      { 
        model: MaterialConsumptionItem, 
        as: 'items', 
        where: { lote_id: id },
        required: true
      },
      { model: User, as: 'user', attributes: ['id', 'first_name', 'last_name'] }
    ],
    order: [['created_at', 'ASC']]
  });

  return {
    lote,
    events,
    consumptions
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

    // Check for low stock and notify admin_alm
    const { Material, Notification, User, Role } = require('../../database/models');
    
    // Group consumed items by material_id to check totals once per material
    const materialIds = [...new Set(result.items.map(i => i.material_id))];
    
    for (const matId of materialIds) {
      const inventory = await Inventory.findOne({
        where: { material_id: matId },
        attributes: [[sequelize.fn('SUM', sequelize.col('amount')), 'total_amount']],
        include: [{ model: Material, as: 'material', attributes: ['name', 'minimum_stock', 'reorder_point', 'internal_code'] }],
        group: ['material_id', 'material.id'],
        transaction: t
      });

      if (inventory) {
        const total = parseFloat(inventory.getDataValue('total_amount') || 0);
        const minStock = parseFloat(inventory.material?.minimum_stock || 0);
        const reorderPoint = parseFloat(inventory.material?.reorder_point || 0);
        
        let alertType = null;
        if (minStock > 0 && total <= minStock) {
          alertType = 'CRÍTICO';
        } else if (reorderPoint > 0 && total <= reorderPoint) {
          alertType = 'ALERTA';
        }

        if (alertType) {
          // Find users with admin_alm role
          const admins = await User.findAll({
            include: [{ model: Role, as: 'role', where: { code: 'ADMIN_ALM' }, attributes: [] }],
            transaction: t
          });

          for (const admin of admins) {
            await Notification.create({
              recipient_id: admin.id,
              sender_id: currentUser.id,
              type: 'LOW_STOCK',
              title: `Stock ${alertType}: ${inventory.material.internal_code}`,
              message: `El material ${inventory.material.name} ha bajado a ${total} unidades.`,
              is_read: false
            }, { transaction: t });
          }
        }
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

  // Financieros
  const [invValueResult] = await sequelize.query(`
    SELECT SUM(available_amount * unit_cost) as total_value 
    FROM lotes 
    WHERE is_active = true
  `);
  const inventoryValue = parseFloat(invValueResult[0]?.total_value || 0);

  const [silosValResult] = await sequelize.query(`
    SELECT COALESCE(SUM(current_stock_kg * unit_cost), 0) as silos_value,
           COALESCE(SUM(current_stock_kg), 0) as silos_stock
    FROM silos 
    WHERE is_active = true
  `);
  const silosValue = parseFloat(silosValResult[0]?.silos_value || 0);
  const silosStockKg = parseFloat(silosValResult[0]?.silos_stock || 0);

  const [lossBreakdownResult] = await sequelize.query(`
    SELECT 
      SUM(CASE WHEN type = 'MERMA' THEN COALESCE(NULLIF(total_cost, 0), ABS(quantity_change) * COALESCE(unit_cost, 0)) ELSE 0 END) as merma_loss,
      SUM(CASE WHEN type = 'SCRAP' THEN COALESCE(NULLIF(total_cost, 0), ABS(quantity_change) * COALESCE(unit_cost, 0)) ELSE 0 END) as scrap_loss,
      SUM(CASE WHEN type IN ('BAJA', 'DISPOSE') THEN COALESCE(NULLIF(total_cost, 0), ABS(quantity_change) * COALESCE(unit_cost, 0)) ELSE 0 END) as baja_loss,
      SUM(CASE WHEN type = 'MERMA' THEN ABS(quantity_change) ELSE 0 END) as merma_qty,
      SUM(CASE WHEN type = 'SCRAP' THEN ABS(quantity_change) ELSE 0 END) as scrap_qty,
      SUM(CASE WHEN type IN ('BAJA', 'DISPOSE') THEN ABS(quantity_change) ELSE 0 END) as baja_qty
    FROM inventory_movements 
    WHERE type IN ('MERMA', 'SCRAP', 'BAJA', 'DISPOSE')
  `);
  const mermaLoss = parseFloat(lossBreakdownResult[0]?.merma_loss || 0);
  const scrapLoss = parseFloat(lossBreakdownResult[0]?.scrap_loss || 0);
  const bajaLoss = parseFloat(lossBreakdownResult[0]?.baja_loss || 0);
  const lossValue = mermaLoss + scrapLoss + bajaLoss;

  const mermaQty = parseFloat(lossBreakdownResult[0]?.merma_qty || 0);
  const scrapQty = parseFloat(lossBreakdownResult[0]?.scrap_qty || 0);
  const bajaQty = parseFloat(lossBreakdownResult[0]?.baja_qty || 0);
  const totalLossQty = mermaQty + scrapQty + bajaQty;

  // 1. Total Entradas (Número de lotes recibidos reales)
  const entradasCount = await Lote.count();

  // 2. Bajas y Consumos (Número de transacciones)
  const bajasCount = await InventoryMovement.count({
    where: {
      type: {
        [sequelize.Sequelize.Op.in]: ['BAJA', 'DISPOSE', 'CONSUMPTION']
      }
    }
  });

  // 3. Merma / Scrap (Kilos totales)
  const mermaResult = await InventoryMovement.sum('quantity_change', {
    where: {
      type: {
        [sequelize.Sequelize.Op.in]: ['MERMA', 'SCRAP']
      }
    }
  });
  const mermaKg = Math.abs(parseFloat(mermaResult || 0));

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
        attributes: ['minimum_stock', 'reorder_point'],
      }
    ],
    group: ['material_id', 'material.id']
  });

  let stockBajoCount = 0;
  for (const item of inventoryItems) {
    const total = parseFloat(item.getDataValue('total_amount') || 0);
    const minStock = parseFloat(item.material?.minimum_stock || 0);
    const reorderPoint = parseFloat(item.material?.reorder_point || 0);
    // Rojo (<= minimo) o Amarillo (<= reorder)
    if ((minStock > 0 && total <= minStock) || (reorderPoint > 0 && total <= reorderPoint)) {
      stockBajoCount++;
    }
  }

  // Gráficas adaptativas: Combinando fechas de Lotes (Entradas) y Movimientos (Salidas)
  // Generamos un chartData con los últimos 7 días con datos agrupados por día
  const [chartDataResult] = await sequelize.query(`
    WITH RECURSIVE dates AS (
      SELECT CURRENT_DATE - INTERVAL '6 days' AS date
      UNION ALL
      SELECT date + INTERVAL '1 day'
      FROM dates
      WHERE date < CURRENT_DATE
    ),
    entradas AS (
      SELECT DATE(date_received) as date, COUNT(*) as count 
      FROM lotes 
      WHERE date_received >= CURRENT_DATE - INTERVAL '6 days'
      GROUP BY DATE(date_received)
    ),
    bajas AS (
      SELECT DATE(created_at) as date, COUNT(*) as count 
      FROM inventory_movements 
      WHERE created_at >= CURRENT_DATE - INTERVAL '6 days' 
        AND type IN ('BAJA', 'DISPOSE', 'MERMA', 'SCRAP')
      GROUP BY DATE(created_at)
    )
    SELECT 
      to_char(d.date, 'DY') as date_label,
      COALESCE(e.count, 0) as entradas,
      COALESCE(b.count, 0) as bajas
    FROM dates d
    LEFT JOIN entradas e ON d.date = e.date
    LEFT JOIN bajas b ON d.date = b.date
    ORDER BY d.date ASC
  `);

  // Transform labels like 'mon' to 'Lun'
  const dayMap = { 'mon': 'Lun', 'tue': 'Mar', 'wed': 'Mié', 'thu': 'Jue', 'fri': 'Vie', 'sat': 'Sáb', 'sun': 'Dom' };
  const chartData = chartDataResult.map(row => ({
    date: dayMap[row.date_label?.toLowerCase().trim()] || row.date_label,
    entradas: parseInt(row.entradas, 10),
    bajas: parseInt(row.bajas, 10)
  }));

  // Consumos Data
  const [mermaDataResult] = await sequelize.query(`
    WITH RECURSIVE dates AS (
      SELECT CURRENT_DATE - INTERVAL '6 days' AS date
      UNION ALL
      SELECT date + INTERVAL '1 day'
      FROM dates
      WHERE date < CURRENT_DATE
    ),
    consumos AS (
      SELECT DATE(created_at) as date, SUM(ABS(quantity_change)) as total 
      FROM inventory_movements 
      WHERE created_at >= CURRENT_DATE - INTERVAL '6 days' 
        AND type IN ('CONSUMPTION', 'MERMA', 'SCRAP')
      GROUP BY DATE(created_at)
    )
    SELECT 
      to_char(d.date, 'DY') as date_label,
      COALESCE(c.total, 0) as consumos
    FROM dates d
    LEFT JOIN consumos c ON d.date = c.date
    ORDER BY d.date ASC
  `);

  const mermaData = mermaDataResult.map(row => ({
    date: dayMap[row.date_label?.toLowerCase().trim()] || row.date_label,
    merma: parseFloat(row.consumos)
  }));

  const [pieDataResult] = await sequelize.query(`
    SELECT r.name, SUM(l.available_amount * l.unit_cost) as value
    FROM lotes l
    JOIN materials m ON l.material_id = m.id
    JOIN rankings r ON m.ranking_id = r.id
    WHERE l.is_active = true
    GROUP BY r.name
  `);
  
  const pieData = pieDataResult.map(r => ({
    name: r.name,
    value: parseFloat(r.value || 0)
  })).filter(r => r.value > 0);

  return {
    totalEntradas: entradasCount || 0,
    bajasRegistradas: bajasCount || 0, // Number of transactions for bajas/consumptions
    materialesStockBajo: stockBajoCount,
    mermaRegistrada: Math.abs(mermaKg || 0),
    financial: {
      inventoryValue,
      silosValue,
      silosStockKg,
      lossValue,
      mermaLoss,
      scrapLoss,
      bajaLoss,
      mermaQty,
      scrapQty,
      bajaQty,
      totalLossQty
    },
    chartData,
    mermaData,
    pieData
  };
};

const manualEntry = async (payload, currentUser) => {
  if (!payload.material_id || !payload.entries || !Array.isArray(payload.entries) || payload.entries.length === 0) {
    throwHttpError('Faltan datos obligatorios para el ingreso manual (material y al menos una entrada).', 400);
  }

  const invoiceCurrencies = payload.entries.map((entry) => String(entry.currency || payload.currency || 'MXN').toUpperCase());
  if (invoiceCurrencies.some((currency) => !['MXN', 'USD'].includes(currency))) {
    throwHttpError('Moneda no soportada. Selecciona MXN o USD en cada factura.', 400);
  }
  const exchangeRateService = require('./exchangeRate.service');
  const invoiceDates = payload.entries.map((entry) => String(entry.invoice_date || exchangeRateService.localDate()));
  const uniqueInvoiceDates = [...new Set(invoiceDates)];
  const exchangeRatesByDate = Object.fromEntries(await Promise.all(uniqueInvoiceDates.map(async (date) => [
    date,
    await exchangeRateService.getUsdMxnRate(date),
  ])));
  const rateForEntry = (entry) => exchangeRatesByDate[String(entry.invoice_date || exchangeRateService.localDate())];
  const mxnUnitCostFor = (entry) => {
    const rawCost = Number(entry.unit_cost);
    const currency = String(entry.currency || payload.currency || 'MXN').toUpperCase();
    return Number((currency === 'USD' ? rawCost * rateForEntry(entry).rate : rawCost).toFixed(4));
  };
  const usdUnitCostFor = (entry) => {
    const rawCost = Number(entry.unit_cost);
    const currency = String(entry.currency || payload.currency || 'MXN').toUpperCase();
    return Number((currency === 'USD' ? rawCost : rawCost / rateForEntry(entry).rate).toFixed(6));
  };

  return await sequelize.transaction(async (t) => {
    const { InventoryMovement, Lote, Inventory, QrBatch, QrCode, TraceabilityEvent, Area, Supplier, Material, Silo } = require('../../database/models');
    
    // Validar material
    const material = await Material.findByPk(payload.material_id, { transaction: t });
    if (!material) {
      throwHttpError('El material especificado no existe.', 404);
    }

    const matName = (material.name || '').toUpperCase();
    const matCode = (material.code || material.internal_code || '').toUpperCase();
    const materialTags = await material.getTags({ attributes: ['id', 'name'], transaction: t });
    const hasPolypropyleneTag = materialTags.some(({ name }) => {
      const normalizedName = String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
      return normalizedName === 'PP' || normalizedName.includes('POLIPROPILENO');
    });
    const configuredSiloTags = await Silo.findAll({
      attributes: ['material_tag_id'],
      where: { is_active: true, material_tag_id: { [Op.not]: null } },
      transaction: t,
    });
    const siloTagIds = new Set(configuredSiloTags.map((silo) => Number(silo.material_tag_id)));
    const matchesSiloTag = materialTags.some((tag) => siloTagIds.has(Number(tag.id)));
    const isPp = matchesSiloTag || hasPolypropyleneTag || matName.includes('POLIPROPILENO') || matName.includes('PP ') || matCode.startsWith('MP-PP') || matCode.includes('PP-');

    // Para materiales distintos de Polipropileno, la localidad de almacén es obligatoria
    if (!isPp && !payload.location_id) {
      throwHttpError('La localidad es obligatoria para el ingreso de este material.', 400);
    }

    // 0. Cache for auto-created suppliers during this transaction
    const createdCatalogs = [];
    const supplierCache = new Map();
    const now = new Date();

    let qrBatch = null;
    let createdQrs = [];
    let targetSilo = null;

    if (isPp) {
      // Regla de Almacén: Si es Polipropileno, NO genera QR y se va a Silos directamente
      if (payload.silo_id) {
        targetSilo = await Silo.findByPk(payload.silo_id, { transaction: t, lock: t.LOCK.UPDATE });
      }
      const matchingTagIds = materialTags.map((tag) => Number(tag.id)).filter((id) => siloTagIds.has(id));
      if (!targetSilo && matchingTagIds.length) {
        targetSilo = await Silo.findOne({
          where: { material_tag_id: { [Op.in]: matchingTagIds }, is_active: true },
          transaction: t,
          lock: t.LOCK.UPDATE
        });
      }
      if (!targetSilo) {
        throwHttpError(`El material ${material.name} no tiene una etiqueta vinculada a un silo activo. Asigna la etiqueta compatible en el catálogo de materiales.`, 400);
      }
      if (!targetSilo.is_active) {
        throwHttpError('El silo seleccionado está inactivo.', 400);
      }
      if (!targetSilo.material_tag_id || !matchingTagIds.includes(Number(targetSilo.material_tag_id))) {
        throwHttpError(`El material no tiene la etiqueta requerida por el silo ${targetSilo.code}.`, 400);
      }
    } else {
      // 1. Generate QR Batch and Codes ONLY for other materials (non-PP)
      const batchCode = `QRB-MAN-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${now.toISOString().slice(11, 19).replace(/:/g, '')}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const areaALM = await Area.findOne({ where: { code: 'ALM' }, transaction: t });
      const assignedAreaId = areaALM ? areaALM.id : null;

      qrBatch = await QrBatch.create({
        batch_code: batchCode,
        quantity: payload.entries.length,
        assigned_area_id: assignedAreaId,
        status: 'ASSIGNED',
        notes: 'Generado desde Ingreso Manual',
        created_by: currentUser.id,
      }, { transaction: t });

      const crypto = require('crypto');
      const seqResult = await sequelize.query(
        `SELECT nextval('qr_code_serial_seq') as serial FROM generate_series(1, :qty);`,
        {
          replacements: { qty: payload.entries.length },
          type: sequelize.QueryTypes.SELECT,
          transaction: t,
        }
      );
      const serials = seqResult.map(r => Number(r.serial));

      const qrRows = [];
      for (let i = 0; i < payload.entries.length; i++) {
        const serial = serials[i];
        qrRows.push({
          uuid: crypto.randomUUID(),
          serial,
          qr_code: `LOT-${String(serial).padStart(9, '0')}`,
          batch_id: qrBatch.id,
          assigned_area_id: assignedAreaId,
          status: 'IN_USE',
          created_by: currentUser.id,
          is_active: true,
          created_at: now,
          updated_at: now,
        });
      }

      createdQrs = await QrCode.bulkCreate(qrRows, { transaction: t, returning: true });

      const eventRows = createdQrs.map(qr => ({
        uuid: crypto.randomUUID(),
        qr_code_id: qr.id,
        event_type: 'ASSIGNED',
        to_status: 'IN_USE',
        to_area_id: assignedAreaId,
        performed_by: currentUser.id,
        notes: 'QR asignado a lote en Ingreso Manual.',
        metadata: { batch_code: batchCode },
        created_at: now,
        updated_at: now,
      }));
      await TraceabilityEvent.bulkCreate(eventRows, { transaction: t });
    }

    let totalQuantity = 0;
    const loteData = [];
    
    for (let i = 0; i < payload.entries.length; i++) {
      const entry = payload.entries[i];
      const generatedFolio = entry.folio ? entry.folio : `S/N-${Date.now()}-${i}`;
      
      if (!entry.quantity || Number(entry.quantity) <= 0) {
        throwHttpError(`La entrada con folio "${generatedFolio}" tiene cantidad menor o igual a 0.`, 400);
      }
      if (entry.unit_cost === undefined || entry.unit_cost === null || Number(entry.unit_cost) < 0) {
        throwHttpError(`La entrada con folio "${generatedFolio}" requiere un costo unitario válido.`, 400);
      }
      
      const q = Number(entry.quantity);
      totalQuantity += q;

      // Resolver o crear proveedor al vuelo
      let finalSupplierId = null;
      const rawSup = String(entry.supplier_id || '').trim();
      const isNewSup = rawSup.startsWith('NEW:') || Boolean(entry.new_supplier_name);
      const supName = isNewSup
        ? (entry.new_supplier_name || rawSup.replace('NEW:', '')).trim().toUpperCase()
        : null;

      if (isNewSup && supName) {
        if (supplierCache.has(supName)) {
          finalSupplierId = supplierCache.get(supName);
        } else {
          let supplier = await Supplier.findOne({
            where: { name: supName },
            paranoid: false,
            transaction: t
          });

          if (supplier) {
            if (supplier.deleted_at) {
              await supplier.restore({ transaction: t });
              await supplier.update({ is_active: true }, { transaction: t });
            }
          } else {
            const sanitize = (str) => (str || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
            const rz = sanitize(supName).substring(0, 3).padEnd(3, 'X');
            const baseCode = `PROV-${rz}-XX`;
            let finalCode = baseCode;
            let counter = 1;
            while (await Supplier.findOne({ where: { code: finalCode }, paranoid: false, transaction: t })) {
              counter++;
              finalCode = `${baseCode}-${counter}`;
            }

            supplier = await Supplier.create({
              code: finalCode,
              name: supName,
              is_active: true,
              created_by: currentUser.id
            }, { transaction: t });

            createdCatalogs.push({
              type: 'supplier',
              catalog: 'Proveedores',
              entity: 'Proveedores',
              name: supplier.name,
              code: supplier.code,
              uuid: supplier.uuid,
              path: '/materials/suppliers'
            });
          }
          finalSupplierId = supplier.id;
          supplierCache.set(supName, supplier.id);
        }
      } else if (entry.supplier_id) {
        if (/^\d+$/.test(String(entry.supplier_id))) {
          finalSupplierId = parseInt(String(entry.supplier_id), 10);
        } else {
          const supplier = await Supplier.findOne({
            where: { uuid: entry.supplier_id },
            transaction: t
          });
          if (supplier) finalSupplierId = supplier.id;
        }
      }

      const invoiceUnitCost = Number(entry.unit_cost);
      const invoiceCurrency = String(entry.currency || payload.currency || 'MXN').toUpperCase();
      const exchange = rateForEntry(entry);
      const mxnUnitCost = mxnUnitCostFor(entry);
      const usdUnitCost = usdUnitCostFor(entry);
      const invoiceDate = String(entry.invoice_date || exchange.requestedDate);
      loteData.push({
        material_id: payload.material_id,
        user_id: currentUser.id,
        qr_id: isPp ? null : createdQrs[i]?.id || null,
        location_id: payload.location_id,
        folio: generatedFolio,
        initial_amount: q,
        available_amount: q,
        notes: payload.notes || (isPp ? `Ingreso a Silo (${targetSilo ? targetSilo.code : 'Silo PP'}) sin QR` : 'Ingreso manual'),
        is_active: true,
        supplier_id: finalSupplierId,
        unit_cost: mxnUnitCost,
        total_cost: mxnUnitCost * q,
        invoice_currency: invoiceCurrency,
        invoice_unit_cost: invoiceUnitCost,
        invoice_unit_cost_mxn: mxnUnitCost,
        invoice_unit_cost_usd: usdUnitCost,
        invoice_date: invoiceDate,
        invoice_exchange_rate: exchange.rate,
        invoice_exchange_rate_date: exchange.date,
        invoice_exchange_rate_source: exchange.source
      });
    }

    // 1. Bulk create lotes
    console.time('Lote.bulkCreate');
    const createdLotes = isPp ? [] : await Lote.bulkCreate(loteData, { transaction: t, returning: true });
    console.timeEnd('Lote.bulkCreate');

    // 2. Upsert Inventory
    console.time('Inventory.findOne');
    let inventory = isPp ? null : await Inventory.findOne({
      where: { material_id: payload.material_id },
      transaction: t
    });
    console.timeEnd('Inventory.findOne');

    console.time('Inventory.save');
    if (!isPp && inventory) {
      inventory.amount = Number(inventory.amount) + totalQuantity;
      await inventory.save({ transaction: t });
    } else if (!isPp) {
      inventory = await Inventory.create({
        material_id: payload.material_id,
        amount: totalQuantity
      }, { transaction: t });
    }
    console.timeEnd('Inventory.save');

    // 2.1 Si es Polipropileno, depositar directamente en el Silo destino
    if (isPp && targetSilo) {
      const stockBefore = Number(targetSilo.current_stock_kg || 0);
      const capacity = Number(targetSilo.capacity_kg || 0);
      if (capacity > 0 && stockBefore + totalQuantity > capacity) {
        throwHttpError(`Capacidad excedida en ${targetSilo.code}: disponible ${Math.max(0, capacity - stockBefore)} kg, recibidos ${totalQuantity} kg.`, 400);
      }
      const existingCost = Number(targetSilo.unit_cost || 0);
      const receivedValue = payload.entries.reduce((sum, entry) => sum + Number(entry.quantity) * mxnUnitCostFor(entry), 0);
      const totalValue = stockBefore * existingCost + receivedValue;
      targetSilo.current_stock_kg = Number((stockBefore + totalQuantity).toFixed(2));
      if (totalValue > 0 && stockBefore + totalQuantity > 0) {
        targetSilo.unit_cost = Number((totalValue / (stockBefore + totalQuantity)).toFixed(4));
      }
      const folios = payload.entries.map((entry) => String(entry.folio || '').trim()).filter(Boolean);
      if (folios.length) targetSilo.current_lot_number = [...new Set(folios)].join(', ').slice(0, 100);
      await targetSilo.save({ transaction: t });
      const { AuditLog } = require('../../database/models');
      await AuditLog.create({
        action: 'SILO_MANUAL_RECEIPT',
        entity_type: 'SILO',
        entity_id: String(targetSilo.id),
        module: 'EXTRUSION_SILOS',
        user_id: currentUser.id,
        description: `Ingreso manual sin QR de ${totalQuantity} kg de ${material.name} al silo ${targetSilo.code}.`,
        before_data: { current_stock_kg: stockBefore, unit_cost: existingCost },
        after_data: { current_stock_kg: Number(targetSilo.current_stock_kg), unit_cost: Number(targetSilo.unit_cost) },
        metadata: { material_id: material.id, polypropylene_tagged: hasPolypropyleneTag, entries: payload.entries.map((entry) => {
          const exchange = rateForEntry(entry);
          const invoiceCurrency = String(entry.currency || payload.currency || 'MXN').toUpperCase();
          return { folio: entry.folio, invoice_date: entry.invoice_date || exchange.requestedDate, quantity: Number(entry.quantity), invoice_unit_cost: Number(entry.unit_cost), invoice_unit_cost_mxn: mxnUnitCostFor(entry), invoice_unit_cost_usd: usdUnitCostFor(entry), currency: invoiceCurrency, exchange_rate_mxn_per_usd: exchange.rate, exchange_rate_date: exchange.date, exchange_rate_source: exchange.source, lot_type: entry.lot_type || null };
        }) },
      }, { transaction: t });
    }

    // 3. Bulk create movements
    console.time('Movement.bulkCreate');
    const movementData = isPp ? [] : payload.entries.map((entry) => ({
      inventory_id: inventory.id,
      type: isPp ? 'ENTRY' : 'MANUAL_ENTRY',
      quantity_change: Number(entry.quantity),
      unit_cost: mxnUnitCostFor(entry),
      total_cost: mxnUnitCostFor(entry) * Number(entry.quantity),
      performed_by: currentUser.id,
      notes: isPp
        ? `Ingreso directo a Silo (${targetSilo ? targetSilo.code : 'Silo PP'}) - Folio: ${entry.folio || 'S/N'}. Consumo directo Mezcladora (Excepción sin QR).`
        : (payload.notes || 'Ingreso manual al sistema (Lote virtual)')
    }));
    
    const createdMovements = movementData.length
      ? await InventoryMovement.bulkCreate(movementData, { transaction: t, returning: true })
      : [];
    console.timeEnd('Movement.bulkCreate');

    // 4. Build results
    const results = [];
    for (let i = 0; i < createdLotes.length; i++) {
      results.push({
        lote: createdLotes[i].toJSON(),
        inventory: inventory.toJSON(),
        movement: createdMovements[i].toJSON()
      });
    }

    const { notifyAdminsIfNonAdmin } = require('../notifications/notification.service');
    await notifyAdminsIfNonAdmin(
      currentUser,
      isPp ? 'Ingreso PP a Silos (Sin QR)' : 'Ingreso Manual Crítico',
      `Se registró un ingreso de ${totalQuantity} kg del material ${material.name}. Destino: ${isPp ? (targetSilo ? targetSilo.name : 'Silos PP') : 'Almacén General'}. Folios: ${payload.entries.map(e => e.folio).join(', ')}.`,
      t
    );

    return { 
      results, 
      qrBatchId: isPp ? null : qrBatch?.id || null, 
      is_silo: isPp,
      invoice_currency: new Set(invoiceCurrencies).size > 1 ? 'MIXED' : invoiceCurrencies[0],
      exchange_rates_by_invoice_date: exchangeRatesByDate,
      silo_code: targetSilo?.code || null,
      silo_name: targetSilo?.name || null,
      total_quantity: totalQuantity,
      created_catalogs: createdCatalogs 
    };
  });
};
const getMermaScrapReport = async () => {
  const { sequelize } = require('../../database/models');

  const [movements] = await sequelize.query(`
    SELECT 
      im.type,
      i.material_id,
      m.internal_code,
      m.name as material_name,
      SUM(ABS(im.quantity_change)) as total_quantity,
      SUM(COALESCE(NULLIF(im.total_cost, 0), ABS(im.quantity_change) * COALESCE(im.unit_cost, 0))) as total_cost
    FROM inventory_movements im
    JOIN inventories i ON im.inventory_id = i.id
    JOIN materials m ON i.material_id = m.id
    WHERE im.type IN ('MERMA', 'SCRAP', 'DISPOSE', 'BAJA')
    GROUP BY im.type, i.material_id, m.internal_code, m.name
  `);

  const materialsMap = {};
  
  movements.forEach(row => {
    const matId = row.material_id;
    if (!materialsMap[matId]) {
      materialsMap[matId] = {
        material_id: matId,
        internal_code: row.internal_code,
        name: row.material_name,
        merma: 0,
        merma_cost: 0,
        scrap: 0,
        scrap_cost: 0,
        baja: 0,
        baja_cost: 0,
        total_loss_qty: 0,
        total_loss_cost: 0
      };
    }
    const qty = parseFloat(row.total_quantity || 0);
    const cost = parseFloat(row.total_cost || 0);

    if (row.type === 'MERMA') {
      materialsMap[matId].merma += qty;
      materialsMap[matId].merma_cost += cost;
    } else if (row.type === 'SCRAP') {
      materialsMap[matId].scrap += qty;
      materialsMap[matId].scrap_cost += cost;
    } else {
      materialsMap[matId].baja += qty;
      materialsMap[matId].baja_cost += cost;
    }
    materialsMap[matId].total_loss_qty += qty;
    materialsMap[matId].total_loss_cost += cost;
  });

  const materialsList = Object.values(materialsMap);

  return materialsList;
};

const getMermaScrapDetails = async (material_id) => {
  const { InventoryMovement, Inventory, User } = require('../../database/models');
  const { Op } = require('sequelize');

  const inventory = await Inventory.findOne({
    where: { material_id },
    attributes: ['id']
  });

  if (!inventory) return [];

  const movements = await InventoryMovement.findAll({
    where: {
      inventory_id: inventory.id,
      type: { [Op.in]: ['MERMA', 'SCRAP', 'DISPOSE', 'BAJA'] }
    },
    order: [['created_at', 'DESC']],
    raw: true
  });

  const userIds = [...new Set(movements.map(m => m.performed_by).filter(Boolean))];
  const users = await User.findAll({
    where: { id: { [Op.in]: userIds } },
    attributes: ['id', 'first_name', 'last_name'],
    raw: true
  });
  
  const userMap = {};
  users.forEach(u => userMap[u.id] = u);

  const result = movements.map(m => {
    const qty = Math.abs(Number(m.quantity_change || 0));
    const unitCost = Number(m.unit_cost || 0);
    const totalCost = Number(m.total_cost || (qty * unitCost));
    return {
      ...m,
      calculated_cost: totalCost,
      user: userMap[m.performed_by] || null
    };
  });

  return result;
};

const getLowStockReport = async () => {
  const { sequelize, Inventory, Material, MaterialFamily, MaterialCode, MaterialType, MaterialBrand, InventoryMovement } = require('../../database/models');
  const { Op } = require('sequelize');

  const inventoryItems = await Inventory.findAll({
    attributes: [
      'material_id',
      [sequelize.fn('SUM', sequelize.col('amount')), 'total_amount']
    ],
    include: [
      {
        model: Material,
        as: 'material',
        attributes: ['id', 'name', 'minimum_stock', 'reorder_point', 'internal_code'],
        include: [
          { model: MaterialFamily, as: 'family', attributes: ['name'] },
          { model: MaterialCode, as: 'material_code', attributes: ['code'] },
          { model: MaterialType, as: 'type', attributes: ['name'] },
          { model: MaterialBrand, as: 'brand', attributes: ['name'] },
        ]
      }
    ],
    group: [
      'material_id', 
      'material.id', 
      'material->family.id', 
      'material->material_code.id',
      'material->type.id',
      'material->brand.id'
    ]
  });

  const lowStockItems = [];

  for (const item of inventoryItems) {
    const total = parseFloat(item.getDataValue('total_amount') || 0);
    const minStock = parseFloat(item.material?.minimum_stock || 0);
    const reorderPoint = parseFloat(item.material?.reorder_point || 0);
    
    // Check if it's yellow or red alert
    if ((minStock > 0 && total <= minStock) || (reorderPoint > 0 && total <= reorderPoint)) {
      // It is in low stock, calculate weekly consumption
      const materialId = item.material.id;
      
      const lastWeekDate = new Date();
      lastWeekDate.setDate(lastWeekDate.getDate() - 7);

      // Find all consumption in the last 7 days for this material's inventories
      const [consumptionResult] = await sequelize.query(`
        SELECT SUM(ABS(im.quantity_change)) as total_consumed
        FROM inventory_movements im
        INNER JOIN inventories i ON im.inventory_id = i.id
        WHERE i.material_id = :materialId
          AND im.type = 'CONSUMPTION'
          AND im.created_at >= :lastWeek
      `, {
        replacements: { materialId, lastWeek: lastWeekDate }
      });

      const weeklyConsumption = parseFloat(consumptionResult[0]?.total_consumed || 0);
      
      // Calculate amount to buy: (Weekly * 4 weeks) - current stock
      // If result is negative or less than minimum package, recommend at least enough to reach minimum_stock or 0 if they don't want any
      let toBuy = (weeklyConsumption * 4) - total;
      
      // If consumption is very low but it's under minimum stock, suggest buying at least enough to reach reorder point
      if (toBuy <= 0) {
        toBuy = Math.max(0, reorderPoint - total, minStock - total);
      }

      lowStockItems.push({
        material_id: materialId,
        familia_articulo: `${item.material.family?.name || ''} - ${item.material.material_code?.code || item.material.internal_code || ''}`,
        descripcion: item.material.name,
        tipo: item.material.type?.name || 'N/A',
        marca: item.material.brand?.name || 'N/A',
        stock_actual: total,
        estado: (minStock > 0 && total <= minStock) ? 'Rojo (Crítico)' : 'Amarillo (Alerta)',
        cantidad_a_comprar: Math.ceil(toBuy)
      });
    }
  }

  return lowStockItems;
};

module.exports = {
  getInventory,
  getMaterialLotes,
  disposeLotes,
  consumeMaterials,
  changeLocation,
  getLoteDetails,
  getDashboardMetrics,
  getAreaInventory,
  getLowStockReport,
  manualEntry,
  getMermaScrapReport,
  getMermaScrapDetails,
  requestDisposeLotes,
  getWasteRequest,
  resolveWasteRequest
};
