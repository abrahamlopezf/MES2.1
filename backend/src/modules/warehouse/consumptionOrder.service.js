const { ConsumptionOrder, ConsumptionOrderItem, QrCode, Material, Lote, User, Area, MaterialUnit, Inventory, InventoryMovement, TraceabilityEvent, Notification } = require('../../database/models');
const { encryptQrData } = require('../../shared/utils/crypto.utils');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');

class ConsumptionOrderService {
  async createOrder(data, transaction = null) {
    const { requested_by, requesting_area_id, items, notes } = data;

    // Generate Order Number
    const count = await ConsumptionOrder.count();
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

      const allocations = [];
      // Create a single soft allocation row (lote_id is assigned to the oldest lot just as a placeholder)
      allocations.push({
        order_id: order.id,
        material_id,
        lote_id: availableLots[0].id,
        requested_quantity: quantity,
        unit_id: availableLots[0].unit_id || null,
      });

      await ConsumptionOrderItem.bulkCreate(allocations, { transaction });
    }

    // Generate QR Code
    // First need a batch or we can just create a single QR. For now let's create a single QR with a dummy batch_id or if required, create a batch.
    // The QrCode model requires batch_id, serial, qr_code, purpose, created_by
    // We will generate it in a simple way.
    const serial = Date.now();
    const qrString = `ORD-${order.uuid}`;
    
    // As a simplification, assuming batch_id = 1 exists, or we should fetch one.
    // Let's create a dummy batch or find first
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

  async getOrderDetails(uuid) {
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
            { model: Material, as: 'material' },
            { 
              model: Lote, 
              as: 'lote',
              include: [{ model: QrCode, as: 'qr_code', attributes: ['qr_code'] }]
            }
          ]
        }
      ]
    });
    
    if (!order) return null;
    
    const plainOrder = order.toJSON();
    plainOrder.encrypted_qr = encryptQrData(`ORD-${plainOrder.uuid}`);
    return plainOrder;
  }

  async updateOrderStatus(uuid, status, resolved_by, transaction = null) {
    const order = await ConsumptionOrder.findOne({ where: { uuid }, transaction });
    if (!order) throw new Error('Orden no encontrada');

    order.status = status;
    if (status === 'SURTIDA' || status === 'CANCELADA') {
      order.resolved_by = resolved_by;
      order.resolved_at = new Date();
    }

    await order.save({ transaction });
    return order;
  }

  async scanFulfillmentItem(uuid, qrData, resolved_by, transaction = null) {
    const order = await this.getOrderDetails(uuid);
    if (!order) throw new Error('Orden no encontrada');
    
    if (order.status !== 'PREPARANDO') {
      throw new Error('La orden no está en estado PREPARANDO (Lista para surtir).');
    }


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
      transaction
    });

    if (!scannedLote) throw new Error(`El código escaneado (${folioStr}) no corresponde a ningún lote válido.`);
    if (!scannedLote.is_active || scannedLote.available_amount <= 0) throw new Error(`El lote escaneado está vacío o inactivo.`);

    // Buscar items pendientes en la orden para ESTE material
    const itemsPending = order.items.filter(item => 
      item.material_id === scannedLote.material_id &&
      Number(item.fulfilled_quantity) < Number(item.requested_quantity)
    );

    if (itemsPending.length === 0) {
      throw new Error('Esta orden ya no requiere más de este material.');
    }

    const itemToFulfill = itemsPending[0];
    const pendingQty = Number(itemToFulfill.requested_quantity) - Number(itemToFulfill.fulfilled_quantity);
    const qtyToTake = Math.min(pendingQty, Number(scannedLote.available_amount));

    if (qtyToTake <= 0) throw new Error('Cantidad a tomar es 0.');

    // Descontar del lote escaneado
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
    } else {
      const alreadyFulfilled = Number(itemToFulfill.fulfilled_quantity);
      await ConsumptionOrderItem.update(
        { requested_quantity: alreadyFulfilled },
        { where: { id: itemToFulfill.id }, transaction }
      );
      
      const newItem = await ConsumptionOrderItem.create({
        order_id: order.id,
        material_id: itemToFulfill.material_id,
        lote_id: scannedLote.id,
        requested_quantity: pendingQty,
        fulfilled_quantity: qtyToTake,
        unit_id: itemToFulfill.unit_id
      }, { transaction });

      itemToFulfill.id = newItem.id;
      itemToFulfill.lote_id = scannedLote.id;
      itemToFulfill.lote = scannedLote;
      itemToFulfill.requested_quantity = pendingQty;
      itemToFulfill.fulfilled_quantity = qtyToTake;
    }

    // 1. Deduct Global Inventory & Create Movement
    const inventory = await Inventory.findOne({ where: { material_id: itemToFulfill.material_id }, transaction });
    if (inventory) {
      inventory.amount = Math.max(0, Number(inventory.amount) - qtyToTake);
      await inventory.save({ transaction });

      await InventoryMovement.create({
        inventory_id: inventory.id,
        type: 'CONSUMPTION',
        quantity_change: -qtyToTake,
        performed_by: resolved_by,
        notes: `Consumo de ${qtyToTake} unidades. Lote afectado: ${itemToFulfill.lote.folio}. Orden: ${order.order_number}`
      }, { transaction });
    }

    // 2. Create TraceabilityEvent & update QR if depleted
    if (itemToFulfill.lote && itemToFulfill.lote.qr_id) {
      const lote = await Lote.findByPk(itemToFulfill.lote_id, { transaction });
      const isTotal = lote && !lote.is_active;
      
      const isExtrusion = order.requesting_area?.name?.toUpperCase().includes('EXTRUS');
      
      let toStatus = 'ACTIVE';
      let eventType = 'CONSUMO';
      
      if (isExtrusion) {
        toStatus = 'IN_WIP';
        eventType = 'TRANSFERENCIA_WIP';
        
        await QrCode.update({ status: 'IN_WIP', is_active: true, assigned_area_id: order.requesting_area_id }, { where: { id: itemToFulfill.lote.qr_id }, transaction });
        
        const { WipInventory } = require('../../database/models');
        const wipItem = await WipInventory.findOne({
          where: { material_id: itemToFulfill.material_id, lote_id: itemToFulfill.lote_id, qr_code_id: itemToFulfill.lote.qr_id, area_id: order.requesting_area_id },
          transaction
        });
        
        if (wipItem) {
          wipItem.amount = Number(wipItem.amount) + qtyToTake;
          await wipItem.save({ transaction });
        } else {
          await WipInventory.create({
            material_id: itemToFulfill.material_id,
            lote_id: itemToFulfill.lote_id,
            qr_code_id: itemToFulfill.lote.qr_id,
            area_id: order.requesting_area_id,
            amount: qtyToTake
          }, { transaction });
        }
        
      } else {
        if (isTotal) {
          toStatus = 'CONSUMED';
          await QrCode.update({ status: 'CONSUMED', is_active: false }, { where: { id: itemToFulfill.lote.qr_id }, transaction });
        }
      }

      await TraceabilityEvent.create({
        qr_code_id: itemToFulfill.lote.qr_id,
        event_type: eventType,
        entity_type: 'LOTE',
        entity_id: itemToFulfill.lote_id.toString(),
        from_status: 'ACTIVE',
        to_status: toStatus,
        performed_by: resolved_by,
        notes: isExtrusion ? `Transferencia de ${qtyToTake} a WIP Extrusión. Orden: ${order.order_number}` : `Consumo de ${qtyToTake} unidades. Orden: ${order.order_number}`,
        metadata: { order_number: order.order_number, quantity: qtyToTake, isTotal, isExtrusion }
      }, { transaction });
    }

    // Revisar si ya están todos surtidos
    const allItemsFulfilled = order.items.every(item => {
      // Evaluamos en memoria con el cambio recién hecho
      const currentFulfilled = item.id === itemToFulfill.id ? itemToFulfill.fulfilled_quantity : item.fulfilled_quantity;
      return Number(currentFulfilled) >= Number(item.requested_quantity);
    });

    if (allItemsFulfilled) {
      await this.updateOrderStatus(uuid, 'SURTIDA', resolved_by, transaction);
    }

    return this.getOrderDetails(uuid);
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

      // Restaurar inventario para cada item
      for (const item of order.items) {
        // Solo restauramos lo que NO se haya surtido aún.
        // Si order estaba PENDIENTE o PREPARANDO, la cantidad "reservada" en el lote fue requested_quantity
        // pero la cantidad real descontada globalmente o localmente debe volver a sumarse.
        // Espera, en createOrder restamos 'requested_quantity' directamente del 'lote.available_amount'.
        // Así que debemos sumar (requested_quantity - fulfilled_quantity) de vuelta al lote.
        const amountToRestore = Number(item.requested_quantity) - Number(item.fulfilled_quantity || 0);

        if (amountToRestore > 0) {
          const newAmount = Number(item.lote.available_amount) + amountToRestore;
          await item.lote.update({
            available_amount: newAmount,
            is_active: true // reactivar si había llegado a 0
          }, { transaction });

          // Si el QR del lote estaba DISPOSED o CONSUMED, reactivarlo (ya que le devolvimos inventario)
          if (item.lote.qr_code) {
            if (item.lote.qr_code.status === 'CONSUMED' || item.lote.qr_code.status === 'DISPOSED' || !item.lote.qr_code.is_active) {
              await item.lote.qr_code.update({
                status: 'ACTIVE',
                is_active: true
              }, { transaction });
            }
          }
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
