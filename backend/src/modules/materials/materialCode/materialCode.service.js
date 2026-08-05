const { BaseCatalogService } = require('../../../services/BaseCatalogService');
const { MaterialCode } = require('../../../database/models');

class MaterialCodeService extends BaseCatalogService {
  constructor() {
    super(MaterialCode, 'Código de Material');
  }
}

module.exports = new MaterialCodeService();
