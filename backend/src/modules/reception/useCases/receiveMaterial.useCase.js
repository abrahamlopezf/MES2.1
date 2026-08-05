const { sequelize, QrCode, Material, OperationalArea } = require('../../../database/models');
const qrDomainService = require('../../qrcodes/qrDomain.service');
const inventoryDomainService = require('../../warehouse/inventoryDomain.service');
const traceabilityDomainService = require('../../traceability/traceabilityDomain.service');

class ReceiveMaterialUseCase {
  /**
   * Ejecuta la recepción de material (Lógica de Negocio Pura)
   * @param {Object} payload DTO validado
   * @param {Number} userId ID del usuario que ejecuta
   */
  async execute(payload, userId) {
    const {
      qr_code_value,
      material_id,
      location_id,
      unit_id,
      quantity,
      notes = null
    } = payload;

    return await sequelize.transaction(async (t) => {
      // 1. Bloqueo pesimista del QR para evitar concurrencia (SELECT ... FOR UPDATE)
      const qrCode = await QrCode.findOne({
        where: { qr_code: qr_code_value },
        lock: t.LOCK.UPDATE, // <-- Política de Bloqueo
        transaction: t
      });

      if (!qrCode) {
        throw new Error(`El QR ${qr_code_value} no existe en el sistema.`);
      }

      // Validar propósito (Debe ser de Recepción)
      if (qrCode.purpose !== 'RECEPTION') {
        throw new Error(`El QR ${qr_code_value} tiene propósito ${qrCode.purpose} y no puede ser usado para recepción.`);
      }

      // Validar que el QR esté disponible (QrDomainService)
      await qrDomainService.validateQrStatus(qr_code_value, ['AVAILABLE'], t);

      // Validar catálogos
      const material = await Material.findByPk(material_id, { transaction: t });
      if (!material) throw new Error(`El material con ID ${material_id} no existe.`);

      const location = await OperationalArea.findByPk(location_id, { transaction: t });
      if (!location) throw new Error(`La ubicación con ID ${location_id} no existe.`);

      // 2. Crear Inventario (InventoryDomainService)
      const inventory = await inventoryDomainService.createInventory({
        qr_code_id: qrCode.id,
        qr_code_uuid: qrCode.uuid,
        qr_code_value: qrCode.qr_code,
        material_id,
        location_id,
        unit_id,
        quantity,
        status: 'AVAILABLE',
        notes
      }, t);

      // 3. Crear Movimiento de Inventario de Entrada
      const movement = await inventoryDomainService.recordMovement({
        inventory_id: inventory.id,
        type: 'IN',
        quantity_change: quantity,
        to_location_id: location_id,
        performed_by: userId,
        notes: 'Entrada inicial por recepción'
      }, t);

      // 4. Activar el QR (QrDomainService)
      await qrDomainService.activateQr(qrCode, t);

      // 5. Registrar Evento de Trazabilidad (TraceabilityDomainService)
      await traceabilityDomainService.createEvent({
        qr_id: qrCode.id,
        event_type: 'RECEPTION',
        entity_type: 'INVENTORY',
        entity_id: inventory.uuid,
        performed_by: userId,
        notes
      }, t);

      return {
        success: true,
        message: 'Material recibido correctamente',
        data: {
          inventory_uuid: inventory.uuid,
          qr_code: qrCode.qr_code,
          material: material.description
        }
      };
    });
  }
}

module.exports = new ReceiveMaterialUseCase();
