const { BaseCatalogService } = require('../../../services/BaseCatalogService');
const { MaterialCategory } = require('../../../database/models');

class MaterialCategoryService extends BaseCatalogService {
  constructor() {
    super(MaterialCategory, 'Categoría de Material');
  }
}

module.exports = new MaterialCategoryService();
