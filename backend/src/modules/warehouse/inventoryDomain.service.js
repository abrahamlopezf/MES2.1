const { Inventory, Lote, InventoryMovement, TipoBaja } = require('../../database/models');

class InventoryDomainService {
  /**
   * Registra la recepción de un Lote y actualiza el inventario consolidado.
   */
  async receiveLote(payload, transaction = null) {
    const {
      material_id,
      user_id,
      qr_id,
      location_id,
      supplier_id,
      quantity,
      folio,
      notes = null,
      unit_cost = null,
      total_cost = null
    } = payload;

    if (!folio) throw new Error("Folio de lote es obligatorio");

    // 1. Crear el Lote
    const lote = await Lote.create({
      material_id,
      user_id,
      qr_id,
      location_id,
      supplier_id,
      folio,
      initial_amount: quantity,
      available_amount: quantity,
      notes,
      unit_cost,
      total_cost,
      is_active: true
    }, { transaction });

    // 2. Upsert Inventario (Consolidado por material_id)
    let inventory = await Inventory.findOne({
      where: { material_id },
      transaction
    });

    if (inventory) {
      inventory.amount = Number(inventory.amount) + Number(quantity);
      await inventory.save({ transaction });
    } else {
      inventory = await Inventory.create({
        material_id,
        amount: quantity
      }, { transaction });
    }

    return { lote, inventory };
  }

  /**
   * Dar de baja lotes específicos.
   */
  async disposeLotes(payload, transaction = null) {
    const { items, tipo_baja_id, user_id, notes, material_id, lote_ids } = payload;
    const { Lote, Inventory } = require('../../database/models');

    // Retrocompatibilidad: Si viene en formato antiguo (material_id + lote_ids)
    let processedItems = items;
    if (!processedItems && lote_ids && material_id) {
      // Buscar los lotes completos para obtener sus cantidades disponibles
      const oldLotes = await Lote.findAll({ where: { id: lote_ids, material_id, is_active: true }, transaction });
      processedItems = oldLotes.map(l => ({
        material_id: material_id,
        lote_id: l.id,
        quantity: Number(l.available_amount)
      }));
    }

    if (!processedItems || processedItems.length === 0) {
      throw new Error('No hay ítems especificados para la baja.');
    }

    let totalCostDisposed = 0;
    const materialDiscounts = {};
    const processedLotesResult = [];
    const disposedQuantities = {};

    // Validar y consumir cada item
    for (const item of processedItems) {
      const lote = await Lote.findOne({
        where: { id: item.lote_id, material_id: item.material_id, is_active: true },
        transaction
      });

      if (!lote) {
        throw new Error(`Lote ${item.lote_id} no encontrado o inactivo.`);
      }

      const qtyToDispose = Number(item.quantity);
      if (qtyToDispose <= 0 || Number(lote.available_amount) < qtyToDispose) {
        throw new Error(`Cantidad a dar de baja inválida para el lote ${item.lote_id}.`);
      }

      totalCostDisposed += qtyToDispose * (Number(lote.unit_cost) || 0);
      
      lote.available_amount = Number(lote.available_amount) - qtyToDispose;
      if (lote.available_amount <= 0) {
        lote.available_amount = 0;
        lote.is_active = false;
      }
      await lote.save({ transaction });
      processedLotesResult.push(lote);
      disposedQuantities[lote.id] = qtyToDispose;

      materialDiscounts[item.material_id] = (materialDiscounts[item.material_id] || 0) + qtyToDispose;
    }

    // Descontar inventarios consolidados
    for (const [matId, qty] of Object.entries(materialDiscounts)) {
      const inventory = await Inventory.findOne({ where: { material_id: matId }, transaction });
      if (!inventory) throw new Error(`No hay inventario registrado para el material ${matId}.`);
      
      inventory.amount = Math.max(0, Number(inventory.amount) - qty);
      await inventory.save({ transaction });
      await this.checkStockThresholds(matId, inventory.amount, transaction);
    }

    return { 
      lotes: processedLotesResult, 
      totalCostDisposed, 
      materialDiscounts,
      disposedQuantities
    };
  }

  /**
   * Consumir materiales contra una orden o solicitud
   */
  async consumeMaterials(payload, transaction = null) {
    const { order_number, user_id, items, notes } = payload;
    const { MaterialConsumption, MaterialConsumptionItem } = require('../../database/models');

    // Validar y agrupar por material para descontar del inventario
    const materialDiscounts = {};
    const processedLotes = [];
    const finalConsumptionItems = [];

    // Validar y consumir lotes (soporte para lote_id explícito o FIFO)
    for (const item of items) {
      let remainingToConsume = Number(item.quantity);

      if (remainingToConsume <= 0) {
        throw new Error(`Cantidad a consumir inválida para el material ${item.material_id}.`);
      }

      // Si tenemos lote explícito, consumimos solo de ese
      if (item.lote_id) {
        const lote = await Lote.findOne({
          where: { id: item.lote_id, material_id: item.material_id, is_active: true, is_frozen: false },
          transaction
        });

        if (!lote) {
          throw new Error(`Lote ${item.lote_id} no encontrado, inactivo o congelado.`);
        }

        if (Number(lote.available_amount) < remainingToConsume) {
          throw new Error(`Cantidad insuficiente en lote ${item.lote_id}. Disponible: ${lote.available_amount}, Solicitado: ${remainingToConsume}`);
        }

        lote.available_amount = Number(lote.available_amount) - remainingToConsume;
        if (lote.available_amount <= 0) {
          lote.available_amount = 0;
          lote.is_active = false;
        }

        await lote.save({ transaction });
        processedLotes.push(lote);
        
        finalConsumptionItems.push({
          material_id: item.material_id,
          lote_id: lote.id,
          qr_id: item.qr_id || lote.qr_id,
          quantity: remainingToConsume
        });

        materialDiscounts[item.material_id] = (materialDiscounts[item.material_id] || 0) + remainingToConsume;
      } 
      // Consumo FIFO por material
      else {
        const lotes = await Lote.findAll({
          where: { material_id: item.material_id, is_active: true, is_frozen: false },
          order: [['created_at', 'ASC']], // FIFO: Lotes más antiguos primero
          transaction
        });

        for (const lote of lotes) {
          if (remainingToConsume <= 0) break;

          const available = Number(lote.available_amount);
          if (available <= 0) continue;

          const qtyToConsume = Math.min(available, remainingToConsume);
          
          lote.available_amount = available - qtyToConsume;
          if (lote.available_amount <= 0) {
            lote.available_amount = 0;
            lote.is_active = false;
          }

          await lote.save({ transaction });
          processedLotes.push(lote);
          
          finalConsumptionItems.push({
            material_id: item.material_id,
            lote_id: lote.id,
            qr_id: lote.qr_id,
            quantity: qtyToConsume
          });

          materialDiscounts[item.material_id] = (materialDiscounts[item.material_id] || 0) + qtyToConsume;
          remainingToConsume -= qtyToConsume;
        }

        if (remainingToConsume > 0) {
          throw new Error(`Cantidad insuficiente en inventario para el material ${item.material_id}. Faltan ${remainingToConsume} piezas.`);
        }
      }
    }

    // Descontar inventarios
    for (const [materialId, qty] of Object.entries(materialDiscounts)) {
      const inventory = await Inventory.findOne({
        where: { material_id: materialId },
        transaction
      });

      if (!inventory || Number(inventory.amount) < qty) {
        throw new Error(`Inventario insuficiente para el material ${materialId}.`);
      }

      inventory.amount = Number(inventory.amount) - qty;
      await inventory.save({ transaction });

      await this.checkStockThresholds(materialId, inventory.amount, transaction);
    }

    // Crear el registro de consumo
    const consumption = await MaterialConsumption.create({
      order_number,
      user_id,
      notes
    }, { transaction });

    // Asignar el consumption_id a los items y crearlos
    const consumptionItemsToCreate = finalConsumptionItems.map(item => ({
      ...item,
      consumption_id: consumption.id
    }));

    await MaterialConsumptionItem.bulkCreate(consumptionItemsToCreate, { transaction });

    return { consumption, items: consumptionItemsToCreate, processedLotes };
  }

  /**
   * Cambiar localidad de uno o más Lotes
   */
  async changeLocation(payload, transaction = null) {
    const { lote_id, lote_ids, new_location_id } = payload;
    
    // Normalizar a un arreglo de IDs
    const idsToProcess = lote_ids ? lote_ids : (lote_id ? [lote_id] : []);
    
    if (idsToProcess.length === 0) {
      throw new Error(`Se requiere al menos un lote para cambiar de localidad.`);
    }

    const lotes = await Lote.findAll({
      where: { id: idsToProcess, is_active: true },
      transaction
    });

    if (lotes.length !== idsToProcess.length) {
      const foundIds = lotes.map(l => l.id);
      const missing = idsToProcess.filter(id => !foundIds.includes(id));
      throw new Error(`Lotes no encontrados o inactivos: ${missing.join(', ')}.`);
    }

    for (const lote of lotes) {
      lote.location_id = new_location_id;
      await lote.save({ transaction });
    }

    return { lotes };
  }

  /**
   * Verifica los umbrales de stock de un material (stock mínimo y alerta de stock/reorder point)
   * y genera notificaciones si es necesario.
   */
  async checkStockThresholds(materialId, currentAmount, transaction = null) {
    const { Material, User, Notification, Role } = require('../../database/models');
    
    const material = await Material.findByPk(materialId, { transaction });
    if (!material) return;
    
    const { minimum_stock, reorder_point, name, internal_code } = material;
    
    // Check if thresholds are defined
    const hasMinStock = minimum_stock !== null && minimum_stock !== undefined && Number(minimum_stock) > 0;
    const hasReorder = reorder_point !== null && reorder_point !== undefined && Number(reorder_point) > 0;
    
    if (!hasMinStock && !hasReorder) return;
    
    // Find admin_alm users
    const adminAlms = await User.findAll({
      include: [{
        model: Role,
        as: 'role',
        where: { code: 'ADMIN_ALM' }
      }],
      transaction
    });
    
    if (adminAlms.length === 0) return;
    
    const amount = Number(currentAmount);
    
    const formatLimit = (val) => Number(parseFloat(val).toFixed(3));
    const minStockFormatted = formatLimit(minimum_stock);
    const reorderFormatted = formatLimit(reorder_point);
    const amountFormatted = formatLimit(amount);
    
    let type = null;
    let message = '';
    
    if (hasMinStock && amount <= Number(minimum_stock)) {
      type = 'CRITICAL';
      message = `Urgente realizar compra. El material ${internal_code} (${name}) ha alcanzado su stock mínimo (${minStockFormatted}). Stock actual: ${amountFormatted}`;
    } else if (hasReorder && amount <= Number(reorder_point)) {
      type = 'WARNING';
      message = `Recomendación realizar pedido de material. El material ${internal_code} (${name}) está por debajo de su alerta de stock (${reorderFormatted}). Stock actual: ${amountFormatted}`;
    }
    
    if (type) {
      const notifications = adminAlms.map(admin => ({
        recipient_id: admin.id,
        type: 'SYSTEM_ALERT',
        title: type === 'CRITICAL' ? 'Stock Mínimo Alcanzado' : 'Alerta de Stock',
        message: message,
      }));
      
      await Notification.bulkCreate(notifications, { transaction });
    }
  }

  async requestDisposeLotes(payload, user, transaction = null) {
    const { items, tipo_baja_id, notes, material_id, lote_ids } = payload;
    const { Lote, WasteRequest, Notification, User, Role } = require('../../database/models');

    // Retrocompatibilidad
    let processedItems = items;
    if (!processedItems && lote_ids && material_id) {
      const oldLotes = await Lote.findAll({ where: { id: lote_ids, material_id, is_active: true, is_frozen: false }, transaction });
      processedItems = oldLotes.map(l => ({
        material_id: material_id,
        lote_id: l.id,
        quantity: Number(l.available_amount)
      }));
    }

    if (!processedItems || processedItems.length === 0) {
      throw new Error('No hay ítems para solicitar la baja.');
    }

    // Agrupar por material (WasteRequest requiere un material_id no nulo en la BD)
    const groupedItems = {};
    for (const item of processedItems) {
      if (!groupedItems[item.material_id]) groupedItems[item.material_id] = [];
      groupedItems[item.material_id].push(item);
    }

    const createdRequests = [];

    for (const [matId, group] of Object.entries(groupedItems)) {
      const gLoteIds = group.map(i => i.lote_id);
      const lotes = await Lote.findAll({
        where: { id: gLoteIds, material_id: matId, is_active: true, is_frozen: false },
        transaction
      });

      if (lotes.length !== gLoteIds.length) {
        throw new Error(`Algunos lotes del material ${matId} no existen, están inactivos o congelados.`);
      }

      for (const lote of lotes) {
        lote.is_frozen = true;
        await lote.save({ transaction });
      }

      const wasteReq = await WasteRequest.create({
        material_id: matId,
        lote_ids: group, // Pasamos el array de objetos { material_id, lote_id, quantity }
        tipo_baja_id,
        notes,
        status: 'PENDING',
        requested_by: user.id
      }, { transaction });
      
      createdRequests.push(wasteReq);
    }

    const adminRole = await Role.findOne({ where: { code: 'ADMIN_ALM' }, transaction });
    if (adminRole && createdRequests.length > 0) {
      const admins = await User.findAll({ where: { role_id: adminRole.id, is_active: true }, transaction });
      const notifications = [];
      for (const admin of admins) {
        for (const req of createdRequests) {
          notifications.push({
            recipient_id: admin.id,
            sender_id: user.id,
            type: 'WASTE_REQUEST',
            title: 'Solicitud de Baja de Material',
            message: `El usuario ${user.first_name || 'Sistema'} ha solicitado dar de baja ${req.lote_ids.length} lote(s).?waste_request_id=${req.id}`
          });
        }
      }
      await Notification.bulkCreate(notifications, { transaction });
    }

    return createdRequests;
  }

  async getWasteRequest(requestId, user) {
    const { WasteRequest, User, Material, TipoBaja } = require('../../database/models');
    
    const request = await WasteRequest.findByPk(requestId, {
      include: [
        { model: User, as: 'requester', attributes: ['id', 'first_name', 'last_name'] },
        { model: Material, as: 'material', attributes: ['id', 'internal_code', 'name'] },
        { model: TipoBaja, as: 'tipoBaja', attributes: ['id', 'name'] }
      ]
    });

    if (!request) throw new Error('Solicitud no encontrada');
    return request;
  }

  async resolveWasteRequest(requestId, status, user, transaction = null) {
    const { Lote, WasteRequest, Notification } = require('../../database/models');

    const request = await WasteRequest.findByPk(requestId, { transaction });
    if (!request || request.status !== 'PENDING') {
      throw new Error('Solicitud no encontrada o ya resuelta.');
    }

    request.status = status;
    request.resolved_by = user.id;
    request.resolved_at = new Date();
    await request.save({ transaction });

    // Retrocompatibilidad: extraer IDs si son objetos o usar directamente si son números
    const loteIdsToSearch = Array.isArray(request.lote_ids) 
      ? request.lote_ids.map(i => typeof i === 'object' ? i.lote_id : i)
      : [];

    const lotes = await Lote.findAll({
      where: { id: loteIdsToSearch },
      transaction
    });

    if (status === 'APPROVED') {
      for (const lote of lotes) {
        lote.is_frozen = false;
        await lote.save({ transaction });
      }
      // Si los lotes en el request son objetos, los pasamos como items.
      // Si son números, la función disposeLotes los convertirá (retrocompatibilidad).
      const payload = {
        material_id: request.material_id,
        items: typeof request.lote_ids[0] === 'object' ? request.lote_ids : undefined,
        lote_ids: typeof request.lote_ids[0] === 'number' ? request.lote_ids : undefined,
        tipo_baja_id: request.tipo_baja_id,
        notes: request.notes
      };
      await this.disposeLotes(payload, transaction);
    } else {
      for (const lote of lotes) {
        lote.is_frozen = false;
        await lote.save({ transaction });
      }
    }

    await Notification.create({
      recipient_id: request.requested_by,
      sender_id: user.id,
      type: 'WASTE_RESOLUTION',
      title: 'Resolución de Solicitud de Baja',
      message: `Tu solicitud de baja ha sido ${status === 'APPROVED' ? 'aprobada' : 'rechazada'}.`
    }, { transaction });

    return request;
  }
}

module.exports = new InventoryDomainService();
