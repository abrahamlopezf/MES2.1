const { Material, MaterialFamily, MaterialCode, MaterialBrand, MaterialType, Location } = require('../../../database/models');
const { NotFoundError } = require('../../../services/BaseCatalogService');

class MaterialCrudService {
  
  async create(data) {
    // 1. Resolver UUIDs a IDs internos (INTEGER)
    const family = await MaterialFamily.findOne({ where: { uuid: data.family_uuid } });
    const code = await MaterialCode.findOne({ where: { uuid: data.material_code_uuid } });
    
    if (!family || !code) {
      const err = new Error('Referencias base (Family, Code) inválidas.');
      err.name = 'BusinessRuleError';
      throw err;
    }

    let brandId = null;
    if (data.brand_uuid) {
      const brand = await MaterialBrand.findOne({ where: { uuid: data.brand_uuid } });
      if (brand) brandId = brand.id;
    }

    let typeId = null;
    if (data.type_uuid) {
      const type = await MaterialType.findOne({ where: { uuid: data.type_uuid } });
      if (type) typeId = type.id;
    }
    
    let locationId = null;
    if (data.location_uuid) {
      const location = await Location.findOne({ 
        where: { uuid: data.location_uuid }
      });
      if (location) {
        if (!location.is_active) {
          throw new Error('La localidad sugerida se encuentra inactiva.');
        }
        locationId = location.id;
      }
    }

    // 2. Generar internal_consecutive (Búsqueda del último consecutivo)
    const lastMaterial = await Material.findOne({
      where: { 
        family_id: family.id, 
        material_code_id: code.id 
      },
      order: [['internal_consecutive', 'DESC']],
      paranoid: false // Incluir borrados para no repetir
    });

    let nextConsecutive = 1;
    if (lastMaterial) {
      nextConsecutive = parseInt(lastMaterial.internal_consecutive, 10) + 1;
    }
    const internal_consecutive = nextConsecutive.toString().padStart(3, '0');

    // 3. Generar internal_code
    const internal_code = `${family.code}-${code.code}-${internal_consecutive}`;

    // 4. Crear registro
    const materialData = {
      family_id: family.id,
      material_code_id: code.id,
      brand_id: brandId,
      type_id: typeId,
      ranking_id: data.ranking_id,
      internal_consecutive,
      internal_code,
      name: data.name,
      description: data.description,
      minimum_stock: data.minimum_stock || 0,
      maximum_stock: data.maximum_stock,
      reorder_point: data.reorder_point || 0,
      status: data.status || 'ACTIVE',
      default_location_id: locationId
    };

    return await Material.create(materialData);
  }

  async update(uuid, data) {
    const material = await Material.findOne({ where: { uuid } });
    if (!material) {
      throw new NotFoundError('Material no encontrado.');
    }

    // El esquema Zod de updateSchema ya filtra los UUIDs, así que es seguro aplicar
    
    if (data.location_uuid) {
      const location = await Location.findOne({ 
        where: { uuid: data.location_uuid }
      });
      if (location) {
        if (!location.is_active) {
          throw new Error('La localidad sugerida se encuentra inactiva.');
        }
        data.default_location_id = location.id;
      }
      delete data.location_uuid;
    } else if (data.location_uuid === null) {
      data.default_location_id = null;
      delete data.location_uuid;
    }
    
    return await material.update(data);
  }

  async delete(uuid) {
    const material = await Material.findOne({ where: { uuid } });
    if (!material) {
      throw new NotFoundError('Material no encontrado.');
    }

    // Soft Delete manual para tener control explícito
    material.is_active = false;
    material.deleted_at = new Date();
    await material.save();
    return { success: true, message: 'Material eliminado lógicamente.' };
  }

  async restore(uuid) {
    const material = await Material.findOne({ where: { uuid }, paranoid: false });
    if (!material) {
      throw new NotFoundError('Material no encontrado.');
    }

    material.is_active = true;
    material.deleted_at = null;
    await material.save();

    if (typeof material.restore === 'function') {
      await material.restore();
    }
    return { success: true, message: 'Material restaurado.' };
  }
}

module.exports = new MaterialCrudService();
