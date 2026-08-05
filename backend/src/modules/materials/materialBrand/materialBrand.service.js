const { BaseCatalogService } = require('../../../services/BaseCatalogService');
const { MaterialBrand } = require('../../../database/models');

class MaterialBrandService extends BaseCatalogService {
  constructor() {
    super(MaterialBrand, 'Marca de Material');
  }
}

module.exports = new MaterialBrandService();
