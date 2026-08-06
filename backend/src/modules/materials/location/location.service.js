const { Location } = require('../../../database/models');
const { BaseCatalogService } = require('../../../services/BaseCatalogService');

class LocationService extends BaseCatalogService {
  constructor() {
    super(Location, 'Localidad');
  }
}

module.exports = new LocationService();
