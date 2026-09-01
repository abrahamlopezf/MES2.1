const { BaseCatalogService } = require('../../../services/BaseCatalogService');
const { MaterialUnit } = require('../../../database/models');

class MaterialUnitService extends BaseCatalogService {
  constructor() {
    super(MaterialUnit, 'Unidad de Medida');
  }

  async findByUuid(id) {
    const { NotFoundError } = require('../../../services/BaseCatalogService');
    const record = await this.model.findByPk(id);
    if (!record) throw new NotFoundError(`${this.resourceName} no encontrado.`);
    return record;
  }

  async update(id, data) {
    const record = await this.findByUuid(id);
    return await record.update(data);
  }

  async delete(id) {
    const record = await this.findByUuid(id);
    await record.update({ is_active: false });
    return { success: true, message: `${this.resourceName} desactivado correctamente.` };
  }

  async restore(id) {
    const record = await this.findByUuid(id);
    await record.update({ is_active: true });
    return { success: true, message: `${this.resourceName} reactivado correctamente.` };
  }
}

module.exports = new MaterialUnitService();
