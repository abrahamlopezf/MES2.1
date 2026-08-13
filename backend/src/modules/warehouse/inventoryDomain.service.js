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
      amount: quantity,
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
      totalDisposed += Number(lote.amount);
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
}

module.exports = new InventoryDomainService();
