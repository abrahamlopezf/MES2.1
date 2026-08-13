const { sequelize, QrCode, Material, OperationalArea, MaterialUnit } = require('../../../database/models');
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

      // Validar propósito (Puede ser general o específico de Recepción)
      if (qrCode.purpose !== 'RECEPTION' && qrCode.purpose !== 'general') {
        throw new Error(`El QR ${qr_code_value} tiene propósito ${qrCode.purpose} y no puede ser usado para recepción.`);
      }

      // Validar que el QR esté disponible (QrDomainService)
      await qrDomainService.validateQrStatus(qr_code_value, ['GENERATED', 'UNASSIGNED', 'ASSIGNED'], t);

      // Validar catálogos
      const { Material, Location, MaterialUnit } = require('../../database/models');
      
      const material = await Material.findByPk(material_id, { transaction: t });
      if (!material) throw new Error(`El material con ID ${material_id} no existe.`);

      // Use the material's default location if one wasn't passed, or fall back to the first available Location
      let finalLocationId = location_id || material.default_location_id;
      let location = null;
      if (finalLocationId) {
        location = await Location.findByPk(finalLocationId, { transaction: t });
      } else {
        location = await Location.findOne({ transaction: t });
        finalLocationId = location ? location.id : null;
      }
      
      if (!location) throw new Error(`No se pudo determinar una ubicación válida para la recepción.`);

      const [unitRecord] = await MaterialUnit.findOrCreate({
        where: { code: 'PZA' },
        defaults: { name: 'Pieza', is_active: true },
        transaction: t
      });
      const finalUnitId = unitRecord.id;

      // 2. Crear Lote e Inventario Consolidado (InventoryDomainService)
      const { lote, inventory } = await inventoryDomainService.receiveLote({
        material_id,
        user_id: userId,
        qr_id: qrCode.id,
        location_id: finalLocationId,
        quantity,
        notes
      }, t);

      // 3. Activar el QR (QrDomainService)
      await qrDomainService.activateQr(qrCode, t);

      // 4. Registrar Evento de Trazabilidad (TraceabilityDomainService)
      await traceabilityDomainService.createEvent({
        qr_id: qrCode.id,
        event_type: 'RECEPTION',
        entity_type: 'LOTE',
        entity_id: lote.id.toString(), // Entity ID of Lote
        performed_by: userId,
        notes
      }, t);

      return {
        success: true,
        message: 'Material recibido correctamente en Lote',
        data: {
          lote_id: lote.id,
          inventory_uuid: inventory.uuid,
          qr_code: qrCode.qr_code,
          material: material.description
        }
      };
    });
  }
}

module.exports = new ReceiveMaterialUseCase();
