const { BaseCatalogService } = require('../../../services/BaseCatalogService');
const { OperationalArea } = require('../../../database/models');

class OperationalAreaService extends BaseCatalogService {
  constructor() {
    super(OperationalArea, 'Área Operacional');
  }
}

module.exports = new OperationalAreaService();
