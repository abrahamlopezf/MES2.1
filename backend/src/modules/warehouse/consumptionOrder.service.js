const { sequelize, ConsumptionOrder, ConsumptionOrderItem, QrCode, Material, Lote, User, Area, MaterialUnit, Inventory, InventoryMovement, TraceabilityEvent, Notification } = require('../../database/models');
const { encryptQrData } = require('../../shared/utils/crypto.utils');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');

class ConsumptionOrderService {
  async createOrder(data, transaction = null) {
    if (!transaction) {
      const ownTransaction = await sequelize.transaction();
      try {
        const order = await this.createOrder(data, ownTransaction);
        await ownTransaction.commit();
        return order;
      } catch (error) {
        await ownTransaction.rollback();
        throw error;
      }
    }
    const { requested_by, requesting_area_id, items, notes } = data;
    if (!requesting_area_id) throw new Error('La ODC requiere un área solicitante para asignar su WIP o gasto operativo.');

    // Generate Order Number
    const count = await ConsumptionOrder.count({ transaction });
    const orderNumber = `ORD-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${(count + 1).toString().padStart(3, '0')}`;

    // Create Order
    const order = await ConsumptionOrder.create(
      {
        order_number: orderNumber,
        status: 'PENDIENTE',
        requested_by,
        requesting_area_id,
        notes,
      },
      { transaction }
    );

    // Determine if requesting area is a production process area
    const PROCESS_AREAS = ['EXTRUSION', 'TELARES', 'LAMINADO', 'GLOBO', 'CORTE', 'CONFECCION', 'IMPRENTA', 'PEGADO', 'ENSAMBLADO', 'ETIQUETADO', 'DOBLADO', 'PRENSADO'];
    let isProcessArea = false;
    if (requesting_area_id) {
      const areaRecord = await Area.findByPk(requesting_area_id, { transaction });
      if (areaRecord && areaRecord.code) {
        isProcessArea = PROCESS_AREAS.includes(areaRecord.code.toUpperCase());
      }
    }

    const { QrBatch } = require('../../database/models');
    let batch = await QrBatch.findOne({ transaction });
    if (!batch) {
      batch = await QrBatch.create({
        batch_number: 'BATCH-ORD-001',
        total_qrs: 1000,
        type: 'CONSUMPTION_ORDER',
        created_by: requested_by
      }, { transaction });
    }

    // Process Items and FIFO Allocation
    for (const item of items) {
      const { material_id, quantity } = item;
      
      // Find available lots ordered by date (FIFO)
      const availableLots = await Lote.findAll({
        where: {
          material_id,
          is_active: true,
          available_amount: { [Op.gt]: 0 }
        },
        order: [['created_at', 'ASC']],
        transaction
      });

      // Sum total available
      const totalAvailable = availableLots.reduce((acc, l) => acc + Number(l.available_amount), 0);
      if (totalAvailable < quantity) {
        throw new Error(`Inventario insuficiente para el material ID ${material_id}. Solicitado: ${quantity}, Disponible: ${totalAvailable}.`);
      }

      // Get material to have fallback base_unit_id and check if Raw Material
      const materialRecord = await Material.findByPk(material_id, { 
        attributes: ['id', 'family_id', 'base_unit_id', 'internal_code'], 
        transaction 
      });
      const isRawMaterial = materialRecord?.family_id === 43 || 
                            (materialRecord?.internal_code && materialRecord.internal_code.startsWith('MP-'));
      if (isRawMaterial && !requesting_area_id) {
        throw new Error(`La materia prima ${materialRecord.name || material_id} requiere un área solicitante para ingresar al WIP.`);
      }

      const allocations = [];
      let remainingQuantity = quantity;

      for (const lot of availableLots) {
        if (remainingQuantity <= 0) break;

        const lotAvailable = Number(lot.available_amount);
        const quantityToTake = Math.min(remainingQuantity, lotAvailable);

        let childQrId = null;
        // La materia prima pasa a custodia WIP del área solicitante; los
        // consumibles siguen como gasto directo, independientemente del área.
        if (isRawMaterial && requesting_area_id) {
          // Parent lot nomenclature (conservar nomenclatura padre y heredar cuerpo principal)
          const parentLote = await Lote.findByPk(lot.id, {
            include: [{ model: QrCode, as: 'qr_code' }],
            transaction
          });
          let parentQrCode = parentLote?.qr_code?.qr_code;
          if (!parentQrCode && parentLote?.qr_id) {
            const qrRec = await QrCode.findByPk(parentLote.qr_id, { transaction });
            if (qrRec) parentQrCode = qrRec.qr_code;
          }
          const parentNomenclature = parentQrCode || parentLote?.folio || `LOT-${lot.id}`;

          // Count existing child QRs for this parent lot
          const existingChildCount = await ConsumptionOrderItem.count({
            where: { lote_id: lot.id, child_qr_id: { [Op.ne]: null } },
            transaction
          });
          let snNumber = existingChildCount + allocations.filter(a => a.lote_id === lot.id).length + 1;
          let childQrString = `${parentNomenclature}-SN${snNumber}`;

          // Evitar colisiones garantizando unicidad en qr_codes
          while (await QrCode.findOne({ where: { qr_code: childQrString }, transaction })) {
            snNumber++;
            childQrString = `${parentNomenclature}-SN${snNumber}`;
          }

          // Create Child QR in RESERVED_ORDER status (inactive until order is SURTIDA)
          const childQr = await QrCode.create({
            serial: Date.now() + Math.floor(Math.random() * 100000),
            qr_code: childQrString,
            batch_id: batch.id,
            purpose: 'WIP_PROCESS_INPUT',
            assigned_area_id: requesting_area_id,
            status: 'RESERVED_ORDER',
            created_by: requested_by,
            is_active: false
          }, { transaction });

          childQrId = childQr.id;
        }

        let unitId = lot.unit_id || materialRecord?.base_unit_id;
        if (!unitId && (isRawMaterial || isProcessArea)) {
          unitId = 4; // Default KG
        }

        allocations.push({
          order_id: order.id,
          material_id,
          lote_id: lot.id,
          requested_quantity: quantityToTake,
          unit_id: unitId,
          child_qr_id: childQrId
        });

        remainingQuantity -= quantityToTake;
      }

      await ConsumptionOrderItem.bulkCreate(allocations, { transaction });
    }

    // Generate Order Tracking QR Code
    const serial = Date.now();
    const qrString = `ORD-${order.uuid}`;

    const qr = await QrCode.create({
      serial,
      qr_code: qrString,
      batch_id: batch.id,
      purpose: 'CONSUMPTION_ORDER',
      created_by: requested_by,
      status: 'GENERATED'
    }, { transaction });

    await order.update({ qr_code_id: qr.id }, { transaction });

    return order;
  }

  async getOrders(filters = {}) {
    return ConsumptionOrder.findAll({
      where: filters,
      include: [
        { model: User, as: 'requester', attributes: ['id', 'first_name', 'last_name', 'email'] },
        { model: User, as: 'resolver', attributes: ['id', 'first_name', 'last_name', 'email'] },
        { model: Area, as: 'requesting_area', attributes: ['id', 'name'] }
      ],
      order: [['created_at', 'DESC']]
    });
  }

  async ensureChildQrsForOrder(orderId, requestingAreaId, transaction = null, createdBy = 1) {
    const { ConsumptionOrderItem, Lote, QrCode, QrBatch } = require('../../database/models');
    const { Op } = require('sequelize');

    const itemsWithoutChild = await ConsumptionOrderItem.findAll({
      where: {
        order_id: orderId,
        lote_id: { [Op.ne]: null },
        child_qr_id: null
      },
      include: [
        {
          model: Lote,
          as: 'lote',
          include: [{ model: QrCode, as: 'qr_code' }]
        }
      ],
      transaction
    });

    if (itemsWithoutChild.length === 0) return;

    let batch = await QrBatch.findOne({ transaction });
    if (!batch) {
      batch = await QrBatch.create({
        batch_number: 'BATCH-ORD-AUTO',
        total_qrs: 10000,
        type: 'CONSUMPTION_ORDER',
        created_by: createdBy
      }, { transaction });
    }

    for (const item of itemsWithoutChild) {
      const lote = item.lote;
      if (!lote) continue;

      // Reservar QR hijo solo para materia prima; el WIP nace al confirmar surtido.
      const mat = await Material.findByPk(item.material_id, { attributes: ['id', 'family_id', 'internal_code'], transaction });
      const isRaw = mat?.family_id === 43 || (mat?.internal_code && mat.internal_code.startsWith('MP-'));
      if (!isRaw) continue;

      let parentQrCode = lote.qr_code?.qr_code;
      if (!parentQrCode && lote.qr_id) {
        const qrRec = await QrCode.findByPk(lote.qr_id, { transaction });
        if (qrRec) parentQrCode = qrRec.qr_code;
      }
      const parentNomenclature = parentQrCode || lote.folio || `LOT-${lote.id}`;

      const existingChildCount = await ConsumptionOrderItem.count({
        where: { lote_id: lote.id, child_qr_id: { [Op.ne]: null } },
        transaction
      });
      let snNumber = existingChildCount + 1;
      let childQrString = `${parentNomenclature}-SN${snNumber}`;

      while (await QrCode.findOne({ where: { qr_code: childQrString }, transaction })) {
        snNumber++;
        childQrString = `${parentNomenclature}-SN${snNumber}`;
      }

      const childQr = await QrCode.create({
        serial: Date.now() + Math.floor(Math.random() * 100000),
        qr_code: childQrString,
        batch_id: batch.id,
        purpose: 'WIP_PROCESS_INPUT',
        assigned_area_id: requestingAreaId || 2,
          status: 'RESERVED_ORDER',
          created_by: createdBy,
          is_active: false
      }, { transaction });

      item.child_qr_id = childQr.id;
      await item.save({ transaction });

      // Preparar el QR de la orden no significa que el material ya esté en
      // piso. WIP se crea exclusivamente al confirmar el surtido de Almacén.
    }
  }

  async getOrderDetails(uuid, transaction = null) {
    const rawOrder = await ConsumptionOrder.findOne({ where: { uuid }, transaction });
    if (!rawOrder) return null;

    // Reading order details must stay side-effect free. Legacy rows without a
    // child QR are prepared when the order enters PREPARANDO, not by a GET.
    const order = await ConsumptionOrder.findOne({
      where: { uuid },
      include: [
        { model: User, as: 'requester', attributes: ['id', 'first_name', 'last_name', 'email'] },
        { model: User, as: 'resolver', attributes: ['id', 'first_name', 'last_name', 'email'] },
        { model: Area, as: 'requesting_area', attributes: ['id', 'name'] },
        { 
          model: ConsumptionOrderItem, 
          as: 'items',
          include: [
            { 
              model: Material, 
              as: 'material',
              include: [
                { model: MaterialUnit, as: 'base_unit', attributes: ['id', 'name', 'code'] }
              ]
            },
            { model: MaterialUnit, as: 'unit', attributes: ['id', 'name', 'code'] },
            { 
              model: Lote, 
              as: 'lote',
              include: [{ model: QrCode, as: 'qr_code', attributes: ['id', 'qr_code'] }]
            },
            {
              model: QrCode,
              as: 'child_qr',
              attributes: ['id', 'qr_code', 'status', 'is_active', 'assigned_area_id']
            }
          ]
        }
      ],
      transaction,
    });
    
    if (!order) return null;
    
    const plainOrder = order.toJSON();
    
    // Si la orden ya tiene items asignados a lotes/QRs, no sobreescribir con virtuales para no perder los QRs hijos
    const hasAssignedLots = plainOrder.items && plainOrder.items.some(it => it.lote_id || it.child_qr_id);
    
    if (!hasAssignedLots && (plainOrder.status === 'PENDIENTE' || plainOrder.status === 'PREPARANDO')) {
      const finalItems = [];
      const materialPendingQty = {};
      const materialMap = {};

      for (const item of plainOrder.items) {
        if (!materialMap[item.material_id]) {
          materialMap[item.material_id] = item.material;
          materialPendingQty[item.material_id] = 0;
        }
        
        const fulfilled = Number(item.fulfilled_quantity || 0);
        const req = Number(item.requested_quantity || 0);

        if (fulfilled > 0) {
          finalItems.push({
            ...item,
            requested_quantity: fulfilled,
            fulfilled_quantity: fulfilled
          });
        }
        
        if (req > fulfilled) {
          materialPendingQty[item.material_id] += (req - fulfilled);
        }
      }

      for (const matId of Object.keys(materialPendingQty)) {
        let pending = materialPendingQty[matId];
        if (pending <= 0) continue;

        const availableLots = await Lote.findAll({
          where: {
            material_id: matId,
            is_active: true,
            available_amount: { [Op.gt]: 0 }
          },
          include: [{ model: QrCode, as: 'qr_code', attributes: ['qr_code'] }],
          order: [['created_at', 'ASC']],
          transaction,
        });

        for (const lot of availableLots) {
          if (pending <= 0) break;
          const lotAvailable = Number(lot.available_amount);
          const qtyToTake = Math.min(pending, lotAvailable);
          
          finalItems.push({
            id: 'virtual-' + lot.id,
            order_id: plainOrder.id,
            material_id: matId,
            material: materialMap[matId],
            lote_id: lot.id,
            lote: lot.toJSON(),
            requested_quantity: qtyToTake,
            fulfilled_quantity: 0,
            unit_id: lot.unit_id || materialMap[matId]?.base_unit_id || materialMap[matId]?.base_unit?.id,
            unit: materialMap[matId]?.base_unit
          });
          
          pending -= qtyToTake;
        }

        if (pending > 0) {
          finalItems.push({
            id: 'virtual-missing-' + matId,
            order_id: plainOrder.id,
            material_id: matId,
            material: materialMap[matId],
            lote_id: null,
            lote: null,
            requested_quantity: pending,
            fulfilled_quantity: 0,
            unit_id: materialMap[matId]?.base_unit_id || materialMap[matId]?.base_unit?.id,
            unit: materialMap[matId]?.base_unit
          });
        }
      }

      plainOrder.items = finalItems;
    }

    try {
      const { Role } = require('../../database/models');
      const adminAlmUser = await User.findOne({
        include: [{ model: Role, as: 'role', where: { code: 'ADMIN_ALM' }, attributes: ['code', 'name'] }],
        attributes: ['id', 'first_name', 'last_name', 'email', 'username'],
        transaction,
      });
      if (adminAlmUser) {
        plainOrder.admin_alm = {
          id: adminAlmUser.id,
          name: `${adminAlmUser.first_name || ''} ${adminAlmUser.last_name || ''}`.trim() || adminAlmUser.username
        };
      }
    } catch (err) {
      console.error('Error fetching admin_alm user:', err);
    }

    plainOrder.encrypted_qr = encryptQrData(`ORD-${plainOrder.uuid}`);
    return plainOrder;
  }

  async updateOrderStatus(uuid, status, resolved_by, transaction = null) {
    const order = await ConsumptionOrder.findOne({ where: { uuid }, transaction });
    if (!order) throw new Error('Orden no encontrada');

    if (status === 'PREPARANDO') {
      await this.ensureChildQrsForOrder(order.id, order.requesting_area_id, transaction, resolved_by);
    }

    order.status = status;
    if (status === 'PREPARANDO' || status === 'SURTIDA' || status === 'CANCELADA') {
      order.resolved_by = resolved_by;
      order.resolved_at = new Date();
    }

    await order.save({ transaction });
    return order;
  }

  async scanFulfillmentItem(uuid, qrData, resolved_by, transaction = null) {
    if (!transaction) {
      const ownTransaction = await sequelize.transaction();
      try {
        const result = await this.scanFulfillmentItem(uuid, qrData, resolved_by, ownTransaction);
        await ownTransaction.commit();
        return result;
      } catch (error) {
        await ownTransaction.rollback();
        throw error;
      }
    }
    const order = await ConsumptionOrder.findOne({
      where: { uuid },
      include: [{ model: Area, as: 'requesting_area' }],
      transaction,
      lock: { level: transaction.LOCK.UPDATE, of: ConsumptionOrder },
    });

    if (!order) throw new Error('Orden no encontrada');
    
    if (order.status !== 'PREPARANDO') {
      throw new Error('La orden no está en estado PREPARANDO (Lista para surtir).');
    }

    order.items = await ConsumptionOrderItem.findAll({
      where: { order_id: order.id },
      include: [{ model: Lote, as: 'lote' }],
      order: [['id', 'ASC']],
      transaction,
      lock: { level: transaction.LOCK.UPDATE, of: ConsumptionOrderItem },
    });


    // Identificar el lote correspondiente al QR
    const folioStr = String(qrData).trim();
    const scannedLote = await Lote.findOne({
      where: {
        [Op.or]: [
          { folio: folioStr },
          { '$qr_code.qr_code$': folioStr }
        ]
      },
      include: [{ model: QrCode, as: 'qr_code' }],
      transaction,
      lock: { level: transaction.LOCK.UPDATE, of: Lote },
    });

    if (!scannedLote) throw new Error(`El código escaneado (${folioStr}) no corresponde a ningún lote válido.`);
    if (!scannedLote.is_active || scannedLote.available_amount <= 0) throw new Error(`El lote escaneado está vacío o inactivo.`);

    const PROCESS_AREAS = ['EXTRUSION', 'TELARES', 'LAMINADO', 'GLOBO', 'CORTE', 'CONFECCION', 'IMPRENTA', 'PEGADO', 'ENSAMBLADO', 'ETIQUETADO', 'DOBLADO', 'PRENSADO'];
    const areaCode = order.requesting_area?.code ? order.requesting_area.code.toUpperCase() : '';
    const isProcessArea = PROCESS_AREAS.includes(areaCode);

    // Buscar items pendientes en la orden para ESTE material
    const itemsPending = order.items.filter(item =>
      Number(item.material_id) === Number(scannedLote.material_id) &&
      Number(item.fulfilled_quantity) < Number(item.requested_quantity)
    );

    if (itemsPending.length === 0) {
      throw new Error('Esta orden ya no requiere más de este material.');
    }

    // Prefer the exact FIFO reservation for this scanned lot. Falling back to
    // another pending line is allowed for substitutions, but must not steal a
    // different lot's reservation when an exact match exists.
    let itemToFulfill = itemsPending.find((item) => Number(item.lote_id) === Number(scannedLote.id)) ||
      itemsPending.find((item) => item.lote_id == null) ||
      itemsPending[0];
    const originallyAssignedLotId = itemToFulfill.lote_id == null ? null : Number(itemToFulfill.lote_id);
    const pendingQty = Number(itemToFulfill.requested_quantity) - Number(itemToFulfill.fulfilled_quantity);
    const qtyToTake = Math.min(pendingQty, Number(scannedLote.available_amount));

    if (qtyToTake <= 0) throw new Error('Cantidad a tomar es 0.');

    // Descontar del lote escaneado
    const lotBalanceBefore = Number(scannedLote.available_amount);
    scannedLote.available_amount = Number(scannedLote.available_amount) - qtyToTake;
    scannedLote.is_active = scannedLote.available_amount > 0;
    await scannedLote.save({ transaction });

    // Actualizar el item de la orden
    if (Number(itemToFulfill.fulfilled_quantity) === 0) {
      await ConsumptionOrderItem.update(
        { lote_id: scannedLote.id, fulfilled_quantity: qtyToTake },
        { where: { id: itemToFulfill.id }, transaction }
      );
      itemToFulfill.lote_id = scannedLote.id;
      itemToFulfill.lote = scannedLote;
      itemToFulfill.fulfilled_quantity = qtyToTake;
    } else if (Number(itemToFulfill.lote_id) === Number(scannedLote.id)) {
      // Repeated scans from the same lot belong to the same fulfillment line.
      itemToFulfill.fulfilled_quantity = Number(itemToFulfill.fulfilled_quantity) + qtyToTake;
      await ConsumptionOrderItem.update(
        { fulfilled_quantity: itemToFulfill.fulfilled_quantity },
        { where: { id: itemToFulfill.id }, transaction }
      );
    } else {
      const alreadyFulfilled = Number(itemToFulfill.fulfilled_quantity);
      await ConsumptionOrderItem.update(
        { requested_quantity: alreadyFulfilled },
        { where: { id: itemToFulfill.id }, transaction }
      );
      
      itemToFulfill = await ConsumptionOrderItem.create({
        order_id: order.id,
        material_id: itemToFulfill.material_id,
        lote_id: scannedLote.id,
        requested_quantity: pendingQty,
        fulfilled_quantity: qtyToTake,
        unit_id: itemToFulfill.unit_id || (isProcessArea ? 4 : null)
      }, { transaction });
      itemToFulfill.lote = scannedLote;
    }

    // Clasificar la salida para separar el valor transferido al WIP del gasto
    // directo en consumibles. El costo siempre usa el lote realmente surtido.
    const materialRec = await Material.findByPk(itemToFulfill.material_id, {
      attributes: ['id', 'family_id', 'internal_code', 'name'],
      transaction
    });
    const isRawMaterial = materialRec?.family_id === 43 ||
      (materialRec?.internal_code && materialRec.internal_code.startsWith('MP-'));
    if (!order.requesting_area_id) {
      throw Object.assign(new Error('La ODC no tiene área solicitante; no se puede asignar WIP ni contabilizar el costo al área.'), { statusCode: 409 });
    }
    const lotUnitCost = scannedLote.unit_cost == null ? null : Number(scannedLote.unit_cost);
    if (!isRawMaterial && (!Number.isFinite(lotUnitCost) || lotUnitCost < 0)) {
      throw Object.assign(new Error('El lote del consumible no tiene costo unitario válido; captura su costo antes de surtir para cargarlo correctamente al área.'), { statusCode: 409 });
    }

    // 1. Descontar Almacén y conservar área, ODC y costo del movimiento.
    const inventory = await Inventory.findOne({ where: { material_id: itemToFulfill.material_id }, transaction, lock: transaction.LOCK.UPDATE });
    if (!inventory) throw Object.assign(new Error('No existe inventario global del material para conciliar el surtido de la ODC.'), { statusCode: 409 });
    if (Number(inventory.amount) + 0.0005 < qtyToTake) {
      throw Object.assign(new Error(`El inventario global (${Number(inventory.amount).toFixed(3)}) es menor que el surtido requerido (${qtyToTake.toFixed(3)}). Corrige la conciliación antes de entregar.`), { statusCode: 409 });
    }
    inventory.amount = Number((Number(inventory.amount) - qtyToTake).toFixed(3));
    await inventory.save({ transaction });

    await InventoryMovement.create({
      inventory_id: inventory.id,
      type: 'CONSUMPTION',
      quantity_change: -qtyToTake,
      performed_by: resolved_by,
      notes: `${isRawMaterial ? 'Transferencia a WIP' : 'Gasto operativo'} de ${qtyToTake} unidades. Lote afectado: ${itemToFulfill.lote.folio}. Orden: ${order.order_number}`,
      unit_cost: lotUnitCost,
      total_cost: lotUnitCost == null ? null : Number((qtyToTake * lotUnitCost).toFixed(4)),
      area_id: order.requesting_area_id,
      consumption_order_id: order.id,
      consumption_order_item_id: itemToFulfill.id,
      cost_treatment: isRawMaterial ? 'WIP_TRANSFER' : 'DIRECT_EXPENSE',
    }, { transaction });

    // 2. Manejo de Trazabilidad y WIP (QRs Hijos para Materia Prima a WIP vs Consumibles a Gasto Operativo)
    let activeChildQrId = itemToFulfill.child_qr_id;
    if (isRawMaterial && activeChildQrId && originallyAssignedLotId && originallyAssignedLotId !== Number(scannedLote.id)) {
      await QrCode.update({ status: 'CANCELADO', is_active: false, cancel_reason: `Lote sustituido durante surtido de ODC ${order.order_number}.` }, { where: { id: activeChildQrId }, transaction });
      activeChildQrId = null;
      itemToFulfill.child_qr_id = null;
      await ConsumptionOrderItem.update({ child_qr_id: null }, { where: { id: itemToFulfill.id }, transaction });
    }
    if (isRawMaterial && order.requesting_area_id) {
      if (activeChildQrId) {
        // Activar el QR hijo previamente reservado
        await QrCode.update({
          status: 'IN_WIP',
          is_active: true,
          assigned_area_id: order.requesting_area_id
        }, { where: { id: activeChildQrId }, transaction });
      } else {
        // Generar y activar QR Hijo si el item no lo tenía (ej. órdenes previas o items divididos)
        let parentQrCode = scannedLote.qr_code?.qr_code;
        if (!parentQrCode && scannedLote.qr_id) {
          const qrRec = await QrCode.findByPk(scannedLote.qr_id, { transaction });
          if (qrRec) parentQrCode = qrRec.qr_code;
        }
        const parentNomenclature = parentQrCode || scannedLote.folio || `LOT-${scannedLote.id}`;
        const existingChildCount = await ConsumptionOrderItem.count({
          where: { lote_id: scannedLote.id, child_qr_id: { [Op.ne]: null } },
          transaction
        });
        let snNumber = existingChildCount + 1;
        let childQrString = `${parentNomenclature}-SN${snNumber}`;
        while (await QrCode.findOne({ where: { qr_code: childQrString }, transaction })) {
          snNumber++;
          childQrString = `${parentNomenclature}-SN${snNumber}`;
        }
        const childQr = await QrCode.create({
          serial: Date.now() + Math.floor(Math.random() * 100000),
          qr_code: childQrString,
          batch_id: scannedLote.qr_code?.batch_id || 1,
          purpose: 'WIP_PROCESS_INPUT',
          assigned_area_id: order.requesting_area_id,
          status: 'IN_WIP',
          created_by: resolved_by,
          is_active: true
        }, { transaction });

        await ConsumptionOrderItem.update({ child_qr_id: childQr.id }, { where: { id: itemToFulfill.id }, transaction });
        itemToFulfill.child_qr_id = childQr.id;
        activeChildQrId = childQr.id;
      }

      // Ingresar a WIP de planta referenciando al QR Hijo
      const { WipInventory } = require('../../database/models');
      const wipItem = await WipInventory.findOne({
        where: {
          material_id: itemToFulfill.material_id,
          lote_id: itemToFulfill.lote_id,
          qr_code_id: activeChildQrId,
          area_id: order.requesting_area_id
        },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      let wipBalanceBefore = 0;
      let wipBalanceAfter = qtyToTake;
      if (wipItem) {
        wipBalanceBefore = Number(wipItem.amount);
        wipBalanceAfter = Number((wipBalanceBefore + qtyToTake).toFixed(3));
        wipItem.amount = wipBalanceAfter;
        await wipItem.save({ transaction });
      } else {
        await WipInventory.create({
          material_id: itemToFulfill.material_id,
          lote_id: itemToFulfill.lote_id,
          qr_code_id: activeChildQrId,
          area_id: order.requesting_area_id,
          amount: qtyToTake
        }, { transaction });
      }

      // Toda MP surtida debe tener saldo trazable en el QR hijo, aun si el
      // lote padre histórico no tiene QR o TraceableItem. El vínculo es opcional.
      if (activeChildQrId) {
        const { TraceabilityLink, TraceableItem, TraceabilityMovement } = require('../../database/models');
        let parentTraceable = itemToFulfill.lote?.qr_id
          ? await TraceableItem.findOne({ where: { qr_code_id: itemToFulfill.lote.qr_id }, transaction })
          : null;
        if (!parentTraceable && itemToFulfill.lote?.qr_id) {
          const parentQr = await QrCode.findByPk(itemToFulfill.lote.qr_id, { transaction });
          if (parentQr) {
            const warehouseArea = await Area.findOne({ where: { code: 'ALMACEN' }, transaction });
            if (!warehouseArea) throw Object.assign(new Error('No existe el área Almacén para reconstruir la trazabilidad del lote padre.'), { statusCode: 409 });
            parentTraceable = await TraceableItem.create({
              qr_code_id: parentQr.id,
              item_type: 'RAW_MATERIAL_LOT',
              material_id: itemToFulfill.material_id,
              product_name: materialRec?.name || 'Materia prima',
              current_area_id: warehouseArea.id,
              quantity_initial: Number(scannedLote.initial_amount || lotBalanceBefore),
              quantity_current: lotBalanceBefore,
              unit: 'KG',
              status: lotBalanceBefore <= 0.001 ? 'CONSUMIDO' : 'DISPONIBLE',
              reference_folio: scannedLote.folio,
              created_by: resolved_by,
            }, { transaction });
            await TraceabilityMovement.create({
              traceable_item_id: parentTraceable.id,
              qr_code_id: parentQr.id,
              movement_type: 'RECEPCION_MP',
              from_area_id: null,
              to_area_id: warehouseArea.id,
              quantity: lotBalanceBefore,
              unit: 'KG',
              balance_after: lotBalanceBefore,
              reference_folio: scannedLote.folio,
              performed_by: resolved_by,
              notes: 'Reconstrucción trazable del saldo actual del lote en Almacén para una etiqueta histórica sin saldo trazable.',
              metadata: { reason: 'RECONSTRUCCION_QR_LOTE', lote_id: scannedLote.id, initial_lot_kg: Number(scannedLote.initial_amount), warehouse_balance_kg: lotBalanceBefore },
            }, { transaction });
          }
        }
        if (parentTraceable && Math.abs(Number(parentTraceable.quantity_current) - lotBalanceBefore) > 0.001) {
          const before = Number(parentTraceable.quantity_current);
          parentTraceable.quantity_current = lotBalanceBefore;
          parentTraceable.status = lotBalanceBefore <= 0.001 ? 'CONSUMIDO' : 'DISPONIBLE';
          parentTraceable.updated_by = resolved_by;
          await parentTraceable.save({ transaction });
          await TraceabilityMovement.create({
            traceable_item_id: parentTraceable.id,
            qr_code_id: itemToFulfill.lote.qr_id,
            movement_type: before > lotBalanceBefore ? 'AJUSTE_SALIDA' : 'AJUSTE_ENTRADA',
            quantity: Number(Math.abs(before - lotBalanceBefore).toFixed(3)),
            unit: 'KG',
            balance_after: lotBalanceBefore,
            reference_folio: order.order_number,
            performed_by: resolved_by,
            notes: 'Conciliación del QR padre contra saldo disponible del lote en Almacén antes del surtido.',
            metadata: { reason: 'CONCILIACION_LOTE_ALMACEN', lote_id: scannedLote.id, lote_balance_kg: lotBalanceBefore, previous_traceable_balance_kg: before },
          }, { transaction });
        }
        let childTraceable = await TraceableItem.findOne({ where: { qr_code_id: activeChildQrId }, transaction });
        if (!childTraceable) {
          childTraceable = await TraceableItem.create({
            qr_code_id: activeChildQrId,
            item_type: 'RAW_MATERIAL_LOT',
            material_id: itemToFulfill.material_id,
            product_name: parentTraceable?.product_name || materialRec?.name || 'Materia prima',
            origin_area_id: parentTraceable?.current_area_id || null,
            current_area_id: order.requesting_area_id,
            quantity_initial: wipBalanceAfter,
            quantity_current: wipBalanceAfter,
            unit: 'KG',
            status: 'EN_PROCESO',
            reference_folio: order.order_number,
            created_by: resolved_by
          }, { transaction });
        } else {
          const traceableBefore = Number(childTraceable.quantity_current);
          if (Math.abs(traceableBefore - wipBalanceBefore) > 0.001) {
            childTraceable.quantity_current = wipBalanceBefore;
            childTraceable.status = wipBalanceBefore <= 0.001 ? 'CONSUMIDO' : 'EN_PROCESO';
            childTraceable.updated_by = resolved_by;
            await childTraceable.save({ transaction });
            await TraceabilityMovement.create({
              traceable_item_id: childTraceable.id,
              qr_code_id: activeChildQrId,
              movement_type: traceableBefore > wipBalanceBefore ? 'AJUSTE_SALIDA' : 'AJUSTE_ENTRADA',
              quantity: Number(Math.abs(traceableBefore - wipBalanceBefore).toFixed(3)),
              unit: 'KG',
              balance_after: wipBalanceBefore,
              reference_folio: order.order_number,
              performed_by: resolved_by,
              notes: 'Conciliación del QR hijo contra saldo WIP previo a la recepción parcial.',
              metadata: { reason: 'CONCILIACION_QR_WIP', wip_before_kg: wipBalanceBefore, traceable_before_kg: traceableBefore },
            }, { transaction });
          }
          childTraceable.quantity_initial = Number((Number(childTraceable.quantity_initial) + qtyToTake).toFixed(3));
          childTraceable.quantity_current = Number((wipBalanceBefore + qtyToTake).toFixed(3));
          childTraceable.status = 'EN_PROCESO';
          childTraceable.updated_by = resolved_by;
          await childTraceable.save({ transaction });
        }
        if (parentTraceable) {
          await TraceabilityLink.create({
            parent_traceable_item_id: parentTraceable.id,
            child_traceable_item_id: childTraceable.id,
            parent_qr_code_id: itemToFulfill.lote.qr_id,
            child_qr_code_id: activeChildQrId,
            link_type: 'DIVISION',
            quantity_used: qtyToTake,
            quantity_generated: qtyToTake,
            unit: 'KG',
            process_area_id: order.requesting_area_id,
            notes: `Sub-lote SN generado para Orden ${order.order_number}`
          }, { transaction });
          const parentBalanceAfter = Number((lotBalanceBefore - qtyToTake).toFixed(3));
          parentTraceable.quantity_current = parentBalanceAfter;
          parentTraceable.status = parentBalanceAfter <= 0.001 ? 'CONSUMIDO' : 'DISPONIBLE';
          parentTraceable.updated_by = resolved_by;
          await parentTraceable.save({ transaction });
          await TraceabilityMovement.create({
            traceable_item_id: parentTraceable.id,
            qr_code_id: itemToFulfill.lote.qr_id,
            movement_type: 'TRANSFERENCIA_AREA',
            from_area_id: parentTraceable.current_area_id || null,
            to_area_id: order.requesting_area_id,
            quantity: qtyToTake,
            unit: 'KG',
            balance_after: parentBalanceAfter,
            reference_folio: order.order_number,
            performed_by: resolved_by,
            notes: `Materia prima transferida de Almacén a WIP de ${order.requesting_area?.name || 'área solicitante'}.`,
            metadata: { area_id: order.requesting_area_id, lote_id: scannedLote.id, child_qr_id: activeChildQrId, order_item_id: itemToFulfill.id },
          }, { transaction });
        }
        await TraceabilityMovement.create({
          traceable_item_id: childTraceable.id,
          qr_code_id: activeChildQrId,
          movement_type: 'RECEPCION_AREA',
          from_area_id: null,
          to_area_id: order.requesting_area_id,
          quantity: qtyToTake,
          unit: 'KG',
          balance_after: wipBalanceAfter,
          reference_folio: order.order_number,
          performed_by: resolved_by,
          notes: `Materia prima recibida desde Almacén al WIP de ${order.requesting_area?.name || 'área solicitante'}.`,
          metadata: { area_id: order.requesting_area_id, lote_id: itemToFulfill.lote_id, order_item_id: itemToFulfill.id, cost_treatment: 'WIP_TRANSFER' },
        }, { transaction });
      }

      // Evento de Trazabilidad en el QR Hijo
      await TraceabilityEvent.create({
        qr_code_id: activeChildQrId,
        event_type: 'TRANSFERENCIA_AREA',
        entity_type: 'LOTE_HIJO',
        entity_id: itemToFulfill.id.toString(),
        from_status: 'RESERVED_ORDER',
        to_status: 'IN_WIP',
        performed_by: resolved_by,
        notes: `Sub-lote activado para entrega en WIP (${order.requesting_area?.name || 'N/A'}). Cantidad: ${qtyToTake}. Orden: ${order.order_number}`,
        metadata: { order_number: order.order_number, quantity: qtyToTake, parent_lote_id: itemToFulfill.lote_id, area_id: order.requesting_area_id }
      }, { transaction });
    } else {
      // Consumo Directo a Gasto Operativo (Consumibles en cualquier área o áreas operativas no productivas)
      if (itemToFulfill.lote && itemToFulfill.lote.qr_id) {
        await TraceabilityEvent.create({
          qr_code_id: itemToFulfill.lote.qr_id,
          event_type: 'GASTO_OPERATIVO',
          entity_type: 'LOTE',
          entity_id: itemToFulfill.lote_id.toString(),
          from_status: 'ACTIVE',
          to_status: 'ACTIVE',
          performed_by: resolved_by,
          notes: `Consumo directo (Gasto Operativo) para área ${order.requesting_area?.name || 'N/A'}. Material: ${materialRec?.name || itemToFulfill.material_id}. Orden: ${order.order_number}`,
          metadata: { order_number: order.order_number, quantity: qtyToTake, area_id: order.requesting_area_id, expense_type: 'GASTO_OPERATIVO' }
        }, { transaction });
      }
    }

    // Revisar si ya están todos surtidos
    const persistedItems = await ConsumptionOrderItem.findAll({
      where: { order_id: order.id },
      attributes: ['requested_quantity', 'fulfilled_quantity'],
      transaction,
    });
    const allItemsFulfilled = persistedItems.length > 0 && persistedItems.every((item) =>
      Number(item.fulfilled_quantity) + 0.0005 >= Number(item.requested_quantity)
    );

    if (allItemsFulfilled) {
      await this.updateOrderStatus(uuid, 'SURTIDA', resolved_by, transaction);
    }

    return this.getOrderDetails(uuid, transaction);
  }

  async cancelOrder(uuid, reason, operatorId, existingTransaction = null) {
    const { sequelize } = require('../../database/models');
    const transaction = existingTransaction || await sequelize.transaction();
    
    try {
      const order = await ConsumptionOrder.findOne({
        where: { uuid },
        include: [
          {
            model: ConsumptionOrderItem,
            as: 'items',
            include: [{ model: Lote, as: 'lote', include: [{ model: QrCode, as: 'qr_code' }] }]
          }
        ],
        transaction
      });

      if (!order) throw new Error('Orden no encontrada');
      if (order.status === 'CANCELADA') throw new Error('La orden ya está cancelada');
      if (order.status === 'SURTIDA') throw new Error('No se puede cancelar una orden completamente surtida');

      // Invalidar cualquier QR Hijo pre-generado que estuviese reservado
      for (const item of order.items) {
        if (item.child_qr_id) {
          await QrCode.update({
            status: 'CANCELADO',
            is_active: false,
            cancel_reason: `Orden ${order.order_number} cancelada: ${reason}`
          }, { where: { id: item.child_qr_id }, transaction });
        }
      }

      // Actualizar estado y notas de la orden
      const appendedNotes = order.notes ? `${order.notes}\n\nCANCELADA - Motivo: ${reason}` : `CANCELADA - Motivo: ${reason}`;
      await order.update({
        status: 'CANCELADA',
        notes: appendedNotes,
        resolved_by: operatorId,
        resolved_at: new Date()
      }, { transaction });

      // Enviar notificacion al creador
      await Notification.create({
        recipient_id: order.requested_by,
        sender_id: operatorId,
        type: 'SYSTEM',
        title: `Orden Cancelada: ${order.order_number}`,
        message: `Orden Cancelada. Motivo: ${reason} ?order_uuid=${order.uuid}`,
        is_read: false
      }, { transaction });

      if (!existingTransaction) await transaction.commit();
      return order;
    } catch (error) {
      if (!existingTransaction) await transaction.rollback();
      throw error;
    }
  }
}

module.exports = new ConsumptionOrderService();
