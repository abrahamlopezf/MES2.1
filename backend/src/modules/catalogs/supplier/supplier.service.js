const { Supplier } = require('../../../database/models');
const { BaseCatalogService } = require('../../../services/BaseCatalogService');

class SupplierService extends BaseCatalogService {
  constructor() {
    super(Supplier, 'Proveedor');
  }
}

module.exports = new SupplierService();
