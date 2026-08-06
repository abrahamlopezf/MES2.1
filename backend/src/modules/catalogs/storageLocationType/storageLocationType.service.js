const { StorageLocationType } = require('../../../database/models');
const { BaseCatalogService } = require('../../../services/BaseCatalogService');

class StorageLocationTypeService extends BaseCatalogService {
  constructor() {
    super(StorageLocationType, 'Tipo de Localidad');
  }
}

module.exports = new StorageLocationTypeService();
