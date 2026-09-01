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
      quantity,
      folio,
      notes = null
    } = payload;

    if (!folio) throw new Error("Folio de lote es obligatorio");

    // 1. Crear el Lote
    const lote = await Lote.create({
      material_id,
      user_id,
      qr_id,
      location_id,
      folio,
      initial_amount: quantity,
      available_amount: quantity,
      notes,
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
    const { material_id, lote_ids, tipo_baja_id, user_id, notes } = payload;

    // Obtener lotes activos correspondientes
    const lotes = await Lote.findAll({
      where: {
        id: lote_ids,
        material_id,
        is_active: true
      },
      transaction
    });

    if (lotes.length !== lote_ids.length) {
      throw new Error('Algunos lotes seleccionados no existen o ya fueron dados de baja.');
    }

    let totalDisposed = 0;
    for (const lote of lotes) {
      totalDisposed += Number(lote.available_amount);
      lote.available_amount = 0;
      lote.is_active = false;
      await lote.save({ transaction });
    }

    // Descontar del inventario consolidado
    const inventory = await Inventory.findOne({
      where: { material_id },
      transaction
    });

    if (!inventory) {
      throw new Error('No hay inventario registrado para este material.');
    }

    inventory.amount = Math.max(0, Number(inventory.amount) - totalDisposed);
    await inventory.save({ transaction });

    await this.checkStockThresholds(material_id, inventory.amount, transaction);

    return { lotes, totalDisposed, inventory };
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
    const { material_id, lote_ids, tipo_baja_id, notes } = payload;
    const { Lote, WasteRequest, Notification, User, Role } = require('../../database/models');

    const lotes = await Lote.findAll({
      where: { id: lote_ids, material_id, is_active: true, is_frozen: false },
      transaction
    });

    if (lotes.length !== lote_ids.length) {
      throw new Error('Algunos lotes seleccionados no existen, están inactivos o ya están congelados.');
    }

    for (const lote of lotes) {
      lote.is_frozen = true;
      await lote.save({ transaction });
    }

    const wasteReq = await WasteRequest.create({
      material_id,
      lote_ids,
      tipo_baja_id,
      notes,
      status: 'PENDING',
      requested_by: user.id
    }, { transaction });

    const adminRole = await Role.findOne({ where: { code: 'ADMIN_ALM' }, transaction });
    if (adminRole) {
      const admins = await User.findAll({ where: { role_id: adminRole.id, is_active: true }, transaction });
      const notifications = admins.map(admin => ({
        recipient_id: admin.id,
        sender_id: user.id,
        type: 'WASTE_REQUEST',
        title: 'Solicitud de Baja de Material',
        message: `El usuario ${user.first_name || 'Sistema'} ha solicitado dar de baja ${lote_ids.length} lote(s).?waste_request_id=${wasteReq.id}`
      }));
      await Notification.bulkCreate(notifications, { transaction });
    }

    return wasteReq;
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

    const lotes = await Lote.findAll({
      where: { id: request.lote_ids },
      transaction
    });

    if (status === 'APPROVED') {
      for (const lote of lotes) {
        lote.is_frozen = false;
        await lote.save({ transaction });
      }
      const payload = {
        material_id: request.material_id,
        lote_ids: request.lote_ids,
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
