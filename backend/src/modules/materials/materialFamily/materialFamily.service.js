const { BaseCatalogService } = require('../../../services/BaseCatalogService');
const { MaterialFamily } = require('../../../database/models');

class MaterialFamilyService extends BaseCatalogService {
  constructor() {
    super(MaterialFamily, 'Familia de Material');
  }

  // Aquí podemos agregar lógica específica de la familia en el futuro
  // Ej: validaciones complejas antes de borrar, buscar familias relacionadas, etc.
}

module.exports = new MaterialFamilyService();
