const { sequelize, QrCode, Material, Location, MaterialUnit, Supplier } = require('../../../database/models');
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
      folio,
      supplier_id = null,
      new_supplier_name = null,
      notes = null,
      unit_cost = null,
      total_cost = null
    } = payload;

    if (!folio) {
      throw new Error("El folio de la factura es obligatorio para la recepción.");
    }

    return await sequelize.transaction(async (t) => {
      // 0. Resolver o Crear Proveedor al vuelo
      const createdCatalogs = [];
      let finalSupplierId = null;

      const rawSupplier = String(supplier_id || '').trim();
      const isNewSupplier = rawSupplier.startsWith('NEW:') || Boolean(new_supplier_name);
      const supplierName = isNewSupplier
        ? (new_supplier_name || rawSupplier.replace('NEW:', '')).trim().toUpperCase()
        : null;

      if (isNewSupplier && supplierName) {
        let supplier = await Supplier.findOne({
          where: { name: supplierName },
          paranoid: false,
          transaction: t
        });

        if (supplier) {
          if (supplier.deleted_at) {
            await supplier.restore({ transaction: t });
            await supplier.update({ is_active: true }, { transaction: t });
          }
        } else {
          // Generar código único PROV-XXX-XX
          const sanitize = (str) => (str || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
          const rz = sanitize(supplierName).substring(0, 3).padEnd(3, 'X');
          const baseCode = `PROV-${rz}-XX`;
          let finalCode = baseCode;
          let counter = 1;
          while (await Supplier.findOne({ where: { code: finalCode }, paranoid: false, transaction: t })) {
            counter++;
            finalCode = `${baseCode}-${counter}`;
          }

          supplier = await Supplier.create({
            code: finalCode,
            name: supplierName,
            is_active: true,
            created_by: userId
          }, { transaction: t });

          createdCatalogs.push({
            type: 'supplier',
            catalog: 'Proveedores',
            entity: 'Proveedores',
            name: supplier.name,
            code: supplier.code,
            uuid: supplier.uuid,
            path: '/materials/suppliers'
          });
        }
        finalSupplierId = supplier.id;
      } else if (supplier_id) {
        if (/^\d+$/.test(String(supplier_id))) {
          finalSupplierId = parseInt(String(supplier_id), 10);
        } else {
          const supplier = await Supplier.findOne({
            where: { uuid: supplier_id },
            transaction: t
          });
          if (supplier) finalSupplierId = supplier.id;
        }
      }

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

      // Registrar Lote (Domain Service)
      const { lote, inventory } = await inventoryDomainService.receiveLote({
        material_id,
        user_id: userId,
        qr_id: qrCode.id,
        location_id: finalLocationId,
        supplier_id: finalSupplierId,
        quantity,
        folio,
        notes,
        unit_cost,
        total_cost
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

      const { notifyAdminsIfNonAdmin } = require('../../notifications/notification.service');
      await notifyAdminsIfNonAdmin(
        { id: userId },
        'Recepción de Material (QR)',
        `Se recibió material mediante escaneo QR (Folio: ${folio}). Cantidad: ${quantity}. QR: ${qrCode.qr_code}. Notas: ${notes || 'Ninguna'}.`,
        t
      );

      return {
        success: true,
        message: 'Material recibido correctamente en Lote',
        data: {
          lote_id: lote.id,
          inventory_uuid: inventory.uuid,
          qr_code: qrCode.qr_code,
          material: material.description || material.name,
          supplier_id: finalSupplierId,
          created_catalogs: createdCatalogs
        }
      };
    });
  }
}

module.exports = new ReceiveMaterialUseCase();
