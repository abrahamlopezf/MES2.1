const { StorageLocationStatus } = require('../../../database/models');
const { BaseCatalogService } = require('../../../services/BaseCatalogService');

class StorageLocationStatusService extends BaseCatalogService {
  constructor() {
    super(StorageLocationStatus, 'Estatus de Localidad');
  }
}

module.exports = new StorageLocationStatusService();
