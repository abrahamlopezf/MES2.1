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
      notes = null
    } = payload;

    // 1. Crear el Lote
    const lote = await Lote.create({
      material_id,
      user_id,
      qr_id,
      location_id,
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

    // Validar todos los lotes
    for (const item of items) {
      const lote = await Lote.findOne({
        where: { id: item.lote_id, material_id: item.material_id, is_active: true },
        transaction
      });

      if (!lote) {
        throw new Error(`Lote ${item.lote_id} no encontrado o inactivo.`);
      }

      if (Number(lote.available_amount) < Number(item.quantity)) {
        throw new Error(`Cantidad insuficiente en lote ${item.lote_id}. Disponible: ${lote.available_amount}, Solicitado: ${item.quantity}`);
      }

      lote.available_amount = Number(lote.available_amount) - Number(item.quantity);
      if (lote.available_amount <= 0) {
        lote.available_amount = 0;
        lote.is_active = false;
      }

      await lote.save({ transaction });
      processedLotes.push(lote);

      materialDiscounts[item.material_id] = (materialDiscounts[item.material_id] || 0) + Number(item.quantity);
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
    }

    // Crear el registro de consumo
    const consumption = await MaterialConsumption.create({
      order_number,
      user_id,
      notes
    }, { transaction });

    // Crear los items de consumo
    const consumptionItems = items.map(item => ({
      consumption_id: consumption.id,
      material_id: item.material_id,
      lote_id: item.lote_id,
      qr_id: item.qr_id,
      quantity: item.quantity
    }));

    await MaterialConsumptionItem.bulkCreate(consumptionItems, { transaction });

    return { consumption, items: consumptionItems, processedLotes };
  }

  /**
   * Cambiar localidad de un Lote
   */
  async changeLocation(payload, transaction = null) {
    const { lote_id, new_location_id } = payload;
    const lote = await Lote.findOne({
      where: { id: lote_id, is_active: true },
      transaction
    });

    if (!lote) {
      throw new Error(`Lote ${lote_id} no encontrado o inactivo.`);
    }

    lote.location_id = new_location_id;
    await lote.save({ transaction });

    return { lote };
  }
}

module.exports = new InventoryDomainService();
