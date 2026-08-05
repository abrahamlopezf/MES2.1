const { Inventory, InventoryMovement } = require('../../database/models');

class InventoryDomainService {
  /**
   * Crea un nuevo registro de inventario físico (Ej: Recepción inicial)
   */
  async createInventory(payload, transaction = null) {
    const {
      qr_code_id,
      qr_code_uuid,
      qr_code_value,
      material_id,
      location_id,
      unit_id,
      quantity, // cantidad inicial que entrará a available
      status = 'AVAILABLE',
      notes = null
    } = payload;

    const inventory = await Inventory.create({
      qr_code_id,
      qr_code_uuid,
      qr_code_value,
      material_id,
      available_quantity: quantity,
      reserved_quantity: 0,
      damaged_quantity: 0,
      unit_id,
      location: String(location_id), // Temporal mapping for existing column
      status,
      notes
    }, { transaction });

    return inventory;
  }

  /**
   * Registra un movimiento inmutable asociado a un inventario.
   */
  async recordMovement(payload, transaction = null) {
    const {
      inventory_id,
      type, // IN, OUT, MOVE, ADJ
      quantity_change,
      from_location_id = null,
      to_location_id = null,
      performed_by,
      notes = null
    } = payload;

    const movement = await InventoryMovement.create({
      inventory_id,
      type,
      quantity_change,
      from_location_id,
      to_location_id,
      performed_by,
      notes
    }, { transaction });

    return movement;
  }
}

module.exports = new InventoryDomainService();
