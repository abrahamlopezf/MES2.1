const { BaseCatalogService } = require('../../../services/BaseCatalogService');
const { MaterialType } = require('../../../database/models');

class MaterialTypeService extends BaseCatalogService {
  constructor() {
    super(MaterialType, 'Tipo de Material');
  }
}

module.exports = new MaterialTypeService();
