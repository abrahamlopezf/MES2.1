const { Warehouse } = require('../../../database/models');
const { BaseCatalogService } = require('../../../services/BaseCatalogService');

class WarehouseService extends BaseCatalogService {
  constructor() {
    super(Warehouse, 'Almacén');
  }
}

module.exports = new WarehouseService();
