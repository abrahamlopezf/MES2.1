const { StorageLocation, Warehouse, StorageLocationType, StorageLocationStatus } = require('../../../database/models');
const { BaseCatalogService } = require('../../../services/BaseCatalogService');
const { Op } = require('sequelize');

class StorageLocationService extends BaseCatalogService {
  constructor() {
    super(StorageLocation, 'Localidad de Almacenamiento');
  }

  async _resolveUuids(data) {
    const resolvedData = { ...data };
    
    if (data.location_type_uuid) {
      const type = await StorageLocationType.findOne({ where: { uuid: data.location_type_uuid } });
      if (!type) throw new Error('Tipo de localidad no encontrado');
      resolvedData.location_type_id = type.id;
      delete resolvedData.location_type_uuid;
    }
    
    if (data.status_uuid) {
      const status = await StorageLocationStatus.findOne({ where: { uuid: data.status_uuid } });
      if (!status) throw new Error('Estatus de localidad no encontrado');
      resolvedData.status_id = status.id;
      delete resolvedData.status_uuid;
    }
    
    if (data.warehouse_uuid) {
      const warehouse = await Warehouse.findOne({ where: { uuid: data.warehouse_uuid } });
      if (!warehouse) throw new Error('Almacén no encontrado');
      resolvedData.warehouse_id = warehouse.id;
      delete resolvedData.warehouse_uuid;
    }
    
    if (data.parent_location_uuid) {
      const parent = await StorageLocation.findOne({ where: { uuid: data.parent_location_uuid } });
      if (!parent) throw new Error('Localidad padre no encontrada');
      resolvedData.parent_location_id = parent.id;
      delete resolvedData.parent_location_uuid;
    }
    
    return resolvedData;
  }

  async create(data) {
    const resolvedData = await this._resolveUuids(data);
    return super.create(resolvedData);
  }

  async update(uuid, data) {
    const resolvedData = await this._resolveUuids(data);
    return super.update(uuid, resolvedData);
  }

  async list(options = {}) {
    const { page = 1, pageSize = 20, search, status, warehouse_uuid, location_type_uuid, include_inactive } = options;
    const offset = (page - 1) * pageSize;
    const limit = parseInt(pageSize, 10);

    const where = {};
    
    if (status !== undefined) {
      where.is_active = status === 'ACTIVE';
    } else if (include_inactive !== 'true' && include_inactive !== true) {
      where.is_active = true;
    }

    if (search) {
      where[Op.or] = [
        { code: { [Op.iLike]: `%${search}%` } },
        { name: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    const include = [
      { model: StorageLocationType, as: 'location_type', attributes: ['uuid', 'code', 'name'] },
      { model: StorageLocationStatus, as: 'status', attributes: ['uuid', 'code', 'name'] },
      { model: Warehouse, as: 'warehouse', attributes: ['uuid', 'code', 'name'] }
    ];
    
    if (warehouse_uuid) {
      const warehouse = await Warehouse.findOne({ where: { uuid: warehouse_uuid } });
      if (warehouse) where.warehouse_id = warehouse.id;
    }
    
    if (location_type_uuid) {
      const type = await StorageLocationType.findOne({ where: { uuid: location_type_uuid } });
      if (type) where.location_type_id = type.id;
    }

    const { count, rows } = await this.model.findAndCountAll({
      where,
      include,
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });

    return {
      data: rows,
      meta: {
        page: parseInt(page, 10),
        pageSize: limit,
        total: count
      }
    };
  }
}

module.exports = new StorageLocationService();
