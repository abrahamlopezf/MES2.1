const { Op } = require('sequelize');
const { Material, MaterialFamily, MaterialCode, MaterialBrand, MaterialType, OperationalArea } = require('../../../database/models');
const { NotFoundError } = require('../../../services/BaseCatalogService'); // Importar el error custom

class MaterialSearchService {
  
  async search(query = {}) {
    const { 
      page = 1, 
      pageSize = 20, 
      search, 
      status, 
      family, 
      brand, 
      type 
    } = query;

    const offset = (page - 1) * pageSize;
    const limit = pageSize;

    const where = {
      is_active: true
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { internal_code: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const include = [];

    if (family) include.push({ model: MaterialFamily, as: 'family', where: { uuid: family } });
    else include.push({ model: MaterialFamily, as: 'family', required: false });


    if (brand) include.push({ model: MaterialBrand, as: 'brand', where: { uuid: brand } });
    else include.push({ model: MaterialBrand, as: 'brand', required: false });

    if (type) include.push({ model: MaterialType, as: 'type', where: { uuid: type } });
    else include.push({ model: MaterialType, as: 'type', required: false });

    // Include OperationalArea for default_location and MaterialCode for material_code mapping
    include.push({ model: OperationalArea, as: 'default_location', required: false });
    include.push({ model: MaterialCode, as: 'material_code', required: false });

    const { count, rows } = await Material.findAndCountAll({
      where,
      include,
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });

    return {
      data: rows,
      meta: {
        page,
        pageSize: limit,
        total: count
      }
    };
  }

  async getByUuid(uuid) {
    const material = await Material.findOne({
      where: { uuid },
      include: [
        { model: MaterialFamily, as: 'family' },
        { model: MaterialCode, as: 'material_code' },
        { model: MaterialBrand, as: 'brand' },
        { model: MaterialType, as: 'type' }
      ]
    });

    if (!material) {
      throw new NotFoundError('Material no encontrado.');
    }

    return material;
  }
}

module.exports = new MaterialSearchService();
