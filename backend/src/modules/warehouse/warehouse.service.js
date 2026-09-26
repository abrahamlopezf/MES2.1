const { Op } = require('sequelize');
const { sequelize, Inventory, Material, Lote, User, Ranking, MaterialUnit } = require('../../database/models');
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

  if (query.search) {
    const s = `%${query.search}%`;
    where[Op.or] = [
      { '$material.name$': { [Op.iLike]: s } },
      { '$material.internal_code$': { [Op.iLike]: s } }
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
        attributes: ['id', 'internal_code', 'name'],
        include: [
          { model: Ranking, as: 'ranking', attributes: ['name', 'nomenclature'] },
          { model: MaterialUnit, as: 'base_unit', attributes: ['code'] }
        ]
      }
    ],
    group: ['material_id', 'material.id', 'material->ranking.id', 'material->base_unit.id'],
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
      if (lowerName.includes('merma')) {
        movementType = 'MERMA';
      } else if (lowerName.includes('scrap')) {
        movementType = 'SCRAP';
      }
    }
    
    const foliosAfectados = result.lotes ? result.lotes.map(l => l.folio).filter(Boolean).join(', ') : '';

    // Crear un movimiento por cada material descontado
    for (const [matId, qty] of Object.entries(result.materialDiscounts || {})) {
      const inventory = await Inventory.findOne({ where: { material_id: matId }, transaction: t });
      if (inventory) {
        await InventoryMovement.create({
          inventory_id: inventory.id,
          type: movementType,
          quantity_change: -qty,
          total_cost: 0, // Nota: el costo global ahora está en result.totalCostDisposed pero para el histórico requeriríamos costo por material
          performed_by: currentUser.id,
          notes: `Baja Global. Facturas afectadas: ${foliosAfectados}. Motivo: ${motivoName}. Notas: ${payload.notes || ''}`
        }, { transaction: t });
      }
    }

    // Registrar Evento de Trazabilidad por cada Lote y actualizar QR status si aplica
    if (result.lotes && result.lotes.length > 0) {
      const { QrCode } = require('../../database/models');
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

  const [lossValueResult] = await sequelize.query(`
    SELECT SUM(ABS(quantity_change) * COALESCE(unit_cost, 0)) as total_loss 
    FROM inventory_movements 
    WHERE type IN ('MERMA', 'SCRAP', 'BAJA', 'DISPOSE')
  `);
  const lossValue = parseFloat(lossValueResult[0]?.total_loss || 0);

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
      lossValue
    },
    chartData,
    mermaData,
    pieData
  };
};

const manualEntry = async (payload, currentUser) => {
  if (!payload.material_id || !payload.location_id || !payload.entries || !Array.isArray(payload.entries) || payload.entries.length === 0) {
    throwHttpError('Faltan datos obligatorios para el ingreso manual (material, localidad, y al menos una entrada).', 400);
  }

  return await sequelize.transaction(async (t) => {
    const { InventoryMovement, Lote, Inventory, QrBatch, QrCode, TraceabilityEvent, Area } = require('../../database/models');
    
    // 1. Generate QR Batch and Codes
    const now = new Date();
    const batchCode = `QRB-MAN-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${now.toISOString().slice(11, 19).replace(/:/g, '')}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const areaALM = await Area.findOne({ where: { code: 'ALM' }, transaction: t });
    const assignedAreaId = areaALM ? areaALM.id : null;

    const qrBatch = await QrBatch.create({
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

    const createdQrs = await QrCode.bulkCreate(qrRows, { transaction: t, returning: true });

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

      loteData.push({
        material_id: payload.material_id,
        user_id: currentUser.id,
        qr_id: createdQrs[i].id,
        location_id: payload.location_id,
        folio: generatedFolio,
        initial_amount: q,
        available_amount: q,
        notes: payload.notes || 'Ingreso manual',
        is_active: true,
        supplier_id: entry.supplier_id || null,
        unit_cost: entry.unit_cost || null,
        total_cost: entry.unit_cost ? Number(entry.unit_cost) * q : null
      });
    }

    // 1. Bulk create lotes
    console.time('Lote.bulkCreate');
    const createdLotes = await Lote.bulkCreate(loteData, { transaction: t, returning: true });
    console.timeEnd('Lote.bulkCreate');

    // 2. Upsert Inventory (only one DB call for finding, one for saving)
    console.time('Inventory.findOne');
    let inventory = await Inventory.findOne({
      where: { material_id: payload.material_id },
      transaction: t
    });
    console.timeEnd('Inventory.findOne');

    console.time('Inventory.save');
    if (inventory) {
      inventory.amount = Number(inventory.amount) + totalQuantity;
      await inventory.save({ transaction: t });
    } else {
      inventory = await Inventory.create({
        material_id: payload.material_id,
        amount: totalQuantity
      }, { transaction: t });
    }
    console.timeEnd('Inventory.save');

    // 3. Bulk create movements
    console.time('Movement.bulkCreate');
    const movementData = payload.entries.map((entry, idx) => ({
      inventory_id: inventory.id,
      type: 'MANUAL_ENTRY',
      quantity_change: Number(entry.quantity),
      unit_cost: entry.unit_cost || null,
      total_cost: entry.unit_cost ? Number(entry.unit_cost) * Number(entry.quantity) : null,
      performed_by: currentUser.id,
      notes: payload.notes || 'Ingreso manual al sistema (Lote virtual)'
    }));
    
    const createdMovements = await InventoryMovement.bulkCreate(movementData, { transaction: t, returning: true });
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

    return { results, qrBatchId: qrBatch.id };
  });
};

const getMermaScrapReport = async () => {
  const { sequelize, InventoryMovement, Inventory, Material } = require('../../database/models');
  const { Op } = require('sequelize');

  // Obtener sumatorias por material y tipo (MERMA / SCRAP)
  const movements = await InventoryMovement.findAll({
    attributes: [
      'type',
      [sequelize.col('inventory.material_id'), 'material_id'],
      [sequelize.col('inventory.material.internal_code'), 'internal_code'],
      [sequelize.col('inventory.material.name'), 'material_name'],
      [sequelize.fn('SUM', sequelize.col('quantity_change')), 'total_quantity']
    ],
    where: {
      type: { [Op.in]: ['MERMA', 'SCRAP', 'DISPOSE'] }
    },
    include: [{
      model: Inventory,
      as: 'inventory',
      attributes: [],
      include: [{
        model: Material,
        as: 'material',
        attributes: []
      }]
    }],
    group: ['type', 'inventory.material_id', 'inventory.material.internal_code', 'inventory.material.name'],
    raw: true
  });

  const materialsMap = {};
  
  movements.forEach(row => {
    const matId = row.material_id;
    if (!materialsMap[matId]) {
      materialsMap[matId] = {
        material_id: matId,
        internal_code: row.internal_code,
        name: row.material_name,
        merma: 0,
        scrap: 0,
        baja: 0,
      };
    }
    // quantity_change es negativo, tomamos Math.abs
    if (row.type === 'MERMA') materialsMap[matId].merma += Math.abs(Number(row.total_quantity));
    if (row.type === 'SCRAP') materialsMap[matId].scrap += Math.abs(Number(row.total_quantity));
    if (row.type === 'DISPOSE') materialsMap[matId].baja += Math.abs(Number(row.total_quantity));
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
      type: { [Op.in]: ['MERMA', 'SCRAP', 'DISPOSE'] }
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

  const result = movements.map(m => ({
    ...m,
    user: userMap[m.performed_by] || null
  }));

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
  getLowStockReport,
  manualEntry,
  getMermaScrapReport,
  getMermaScrapDetails,
  requestDisposeLotes,
  getWasteRequest,
  resolveWasteRequest
};
