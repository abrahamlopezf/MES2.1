const { Op } = require('sequelize');
const { Material, MaterialFamily, MaterialCode, MaterialBrand, MaterialType, Location, MaterialUnit, Tag } = require('../../../database/models');
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
      type,
      tag
    } = query;

    const { MaterialType, Location } = require('../../../database/models');

    const parsedPageSize = pageSize === 'all' ? 10000 : parseInt(pageSize, 10);
    const offset = (page - 1) * parsedPageSize;
    const limit = parsedPageSize;

    const where = {
      is_active: true
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { '$material_code.code$': { [Op.iLike]: `%${search}%` } },
        { '$family.code$': { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (tag) {
      const { Sequelize } = require('sequelize');
      const tagsArray = tag.split(',').map(t => t.trim()).filter(Boolean);
      if (tagsArray.length > 0) {
        where.id = {
          [Op.in]: Sequelize.literal(`(SELECT material_id FROM material_tags mt JOIN tags t ON mt.tag_id = t.id WHERE t.uuid IN (${tagsArray.map(t => `'${t}'`).join(',')}))`)
        };
      }
    }

    const include = [];

    if (family) include.push({ model: MaterialFamily, as: 'family', where: { uuid: family } });
    else include.push({ model: MaterialFamily, as: 'family', required: false });


    if (brand) include.push({ model: MaterialBrand, as: 'brand', where: { uuid: brand } });
    else include.push({ model: MaterialBrand, as: 'brand', required: false });

    if (type) include.push({ model: MaterialType, as: 'type', where: { uuid: type } });
    else include.push({ model: MaterialType, as: 'type', required: false });

    if (Location) {
      include.push({ 
        model: Location, 
        as: 'default_location', 
        required: false,
        attributes: ['id', 'uuid', 'code', 'name']
      });
    } else {
      console.error('Location model is undefined in material.search.service.js');
    }
    
    include.push({ model: MaterialCode, as: 'material_code', required: false });
    include.push({ model: MaterialUnit, as: 'base_unit', required: false });

    const { count, rows } = await Material.findAndCountAll({
      where,
      include,
      limit,
      offset,
      order: [['name', 'ASC']]
    });

    // Fetch tags manually for the retrieved materials to avoid Sequelize subquery/pagination bugs
    if (rows.length > 0) {
      const materialIds = rows.map(r => r.id);
      const materialsWithTags = await Material.findAll({
        where: { id: materialIds },
        include: [{ model: Tag, as: 'tags', required: false, attributes: ['id', 'uuid', 'name', 'color'] }],
        order: [['name', 'ASC']]
      });
      
      // Map tags back to original rows
      const tagMap = {};
      for (const m of materialsWithTags) {
        tagMap[m.id] = m.tags || [];
      }
      for (const row of rows) {
        row.dataValues.tags = tagMap[row.id] || [];
      }
    }

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
    const { Location } = require('../../../database/models');
    const material = await Material.findOne({
      where: { uuid },
      include: [
        { model: MaterialFamily, as: 'family' },
        { model: MaterialCode, as: 'material_code' },
        { model: MaterialBrand, as: 'brand' },
        { model: MaterialType, as: 'type' },
        { model: Location, as: 'default_location', attributes: ['id', 'uuid', 'code', 'name'] },
        { model: MaterialUnit, as: 'base_unit', required: false },
        { model: Tag, as: 'tags', required: false, attributes: ['id', 'uuid', 'name', 'color'] }
      ]
    });

    if (!material) {
      throw new NotFoundError('Material no encontrado.');
    }

    return material;
  }
}

module.exports = new MaterialSearchService();
