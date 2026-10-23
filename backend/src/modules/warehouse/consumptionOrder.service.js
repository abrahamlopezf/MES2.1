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

      const allocations = [];
      let remainingQuantity = quantity;

      for (const lot of availableLots) {
        if (remainingQuantity <= 0) break;

        const lotAvailable = Number(lot.available_amount);
        const quantityToTake = Math.min(remainingQuantity, lotAvailable);

        let childQrId = null;
        // Solo generar QR hijo para Materia Prima en áreas de proceso (Consumibles van a gasto operativo directo)
        if (isProcessArea && isRawMaterial) {
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

  async ensureChildQrsForOrder(orderId, requestingAreaId, transaction = null) {
    const { ConsumptionOrderItem, Lote, QrCode, QrBatch, WipInventory } = require('../../database/models');
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
        created_by: 1
      }, { transaction });
    }

    for (const item of itemsWithoutChild) {
      const lote = item.lote;
      if (!lote) continue;

      // Solo generar QR hijo y asignar a WIP si es Materia Prima (Consumibles son gasto operativo)
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
        status: 'IN_WIP',
        created_by: 1,
        is_active: true
      }, { transaction });

      item.child_qr_id = childQr.id;
      await item.save({ transaction });

      if (requestingAreaId === 2) {
        const qty = Number(item.fulfilled_quantity || item.requested_quantity || 0);
        const wipExisting = await WipInventory.findOne({
          where: { qr_code_id: childQr.id, area_id: 2 },
          transaction
        });
        if (!wipExisting) {
          await WipInventory.create({
            material_id: item.material_id,
            lote_id: item.lote_id,
            qr_code_id: childQr.id,
            area_id: 2,
            amount: qty
          }, { transaction });
        }
      }
    }
  }

  async getOrderDetails(uuid) {
    const rawOrder = await ConsumptionOrder.findOne({ where: { uuid } });
    if (!rawOrder) return null;

    // Asegurar que ningún lote asignado quede sin su QR hijo
    await this.ensureChildQrsForOrder(rawOrder.id, rawOrder.requesting_area_id);

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
      ]
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
          order: [['created_at', 'ASC']]
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
        attributes: ['id', 'first_name', 'last_name', 'email', 'username']
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

    order.status = status;
    if (status === 'PREPARANDO' || status === 'SURTIDA' || status === 'CANCELADA') {
      order.resolved_by = resolved_by;
      order.resolved_at = new Date();
    }

    await order.save({ transaction });
    return order;
  }

  async scanFulfillmentItem(uuid, qrData, resolved_by, transaction = null) {
    const order = await ConsumptionOrder.findOne({
      where: { uuid },
      include: [
        { model: ConsumptionOrderItem, as: 'items', include: [{ model: Lote, as: 'lote' }] },
        { model: Area, as: 'requesting_area' }
      ],
      transaction
    });

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
      Number(item.material_id) === Number(scannedLote.material_id) &&
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
        unit_id: itemToFulfill.unit_id || (isProcessArea ? 4 : null)
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

    // 2. Manejo de Trazabilidad y WIP (QRs Hijos para Materia Prima a WIP vs Consumibles a Gasto Operativo)
    const PROCESS_AREAS = ['EXTRUSION', 'TELARES', 'LAMINADO', 'GLOBO', 'CORTE', 'CONFECCION', 'IMPRENTA', 'PEGADO', 'ENSAMBLADO', 'ETIQUETADO', 'DOBLADO', 'PRENSADO'];
    const areaCode = order.requesting_area?.code ? order.requesting_area.code.toUpperCase() : '';
    const isProcessArea = PROCESS_AREAS.includes(areaCode);

    // Obtener información del material para determinar si es Materia Prima o Consumible
    const materialRec = await Material.findByPk(itemToFulfill.material_id, {
      attributes: ['id', 'family_id', 'internal_code', 'name'],
      transaction
    });
    const isRawMaterial = materialRec?.family_id === 43 || 
                          (materialRec?.internal_code && materialRec.internal_code.startsWith('MP-'));

    let activeChildQrId = itemToFulfill.child_qr_id;
    if (isProcessArea && isRawMaterial) {
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
        transaction
      });

      if (wipItem) {
        wipItem.amount = Number(wipItem.amount) + qtyToTake;
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

      // Vincular Genealogía Padre -> Hijo en TraceabilityLink (si existen unidades trazables)
      if (itemToFulfill.lote?.qr_id && activeChildQrId) {
        const { TraceabilityLink, TraceableItem } = require('../../database/models');
        const parentTraceable = await TraceableItem.findOne({ where: { qr_code_id: itemToFulfill.lote.qr_id }, transaction });
        if (parentTraceable) {
          let childTraceable = await TraceableItem.findOne({ where: { qr_code_id: activeChildQrId }, transaction });
          if (!childTraceable) {
            childTraceable = await TraceableItem.create({
              qr_code_id: activeChildQrId,
              item_type: 'RAW_MATERIAL_LOT',
              material_id: itemToFulfill.material_id,
              product_name: parentTraceable.product_name || 'Insumo Proceso',
              origin_area_id: parentTraceable.current_area_id,
              current_area_id: order.requesting_area_id,
              quantity_initial: qtyToTake,
              quantity_current: qtyToTake,
              unit: 'KG',
              status: 'EN_PROCESO',
              reference_folio: order.order_number,
              created_by: resolved_by
            }, { transaction });
          }
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
        }
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
