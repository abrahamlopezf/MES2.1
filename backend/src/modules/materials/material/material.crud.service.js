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
    
    let baseUnitId = null;
    if (data.base_unit_uuid) {
      const { MaterialUnit } = require('../../../database/models');
      const unit = await MaterialUnit.findByPk(data.base_unit_uuid);
      if (unit) baseUnitId = unit.id;
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
    const internal_code = `${family.code}-${code.code}-${internal_consecutive}`.replace(/--+/g, '-');

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
      default_location_id: locationId,
      base_unit_id: baseUnitId
    };

    const material = await Material.create(materialData);

    if (data.tags && Array.isArray(data.tags)) {
      await material.setTags(data.tags);
    }

    return material;
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

    if (data.type_uuid) {
      const { MaterialType } = require('../../../database/models');
      const type = await MaterialType.findOne({ where: { uuid: data.type_uuid } });
      if (type) data.type_id = type.id;
      delete data.type_uuid;
    } else if (data.type_uuid === null) {
      data.type_id = null;
      delete data.type_uuid;
    }

    if (data.brand_uuid) {
      const { MaterialBrand } = require('../../../database/models');
      const brand = await MaterialBrand.findOne({ where: { uuid: data.brand_uuid } });
      if (brand) data.brand_id = brand.id;
      delete data.brand_uuid;
    } else if (data.brand_uuid === null) {
      data.brand_id = null;
      delete data.brand_uuid;
    }

    if (data.base_unit_uuid) {
      const { MaterialUnit } = require('../../../database/models');
      const unit = await MaterialUnit.findByPk(data.base_unit_uuid);
      if (unit) data.base_unit_id = unit.id;
      delete data.base_unit_uuid;
    } else if (data.base_unit_uuid === null) {
      data.base_unit_id = null;
      delete data.base_unit_uuid;
    }
    
    await material.update(data);

    if (data.tags && Array.isArray(data.tags)) {
      await material.setTags(data.tags);
    }

    return material;
  }

  async delete(uuid, context = {}) {
    const material = await Material.findOne({ where: { uuid } });
    if (!material) {
      throw new NotFoundError('Material no encontrado.');
    }

    const { action, reason, user } = context;
    const { AuditLog } = require('../../../database/models');

    if (action === 'deactivate') {
      material.is_active = false;
      await material.save();
      
      await AuditLog.create({
        entity_type: 'Material',
        entity_id: material.id.toString(),
        action: 'DEACTIVATE',
        module: 'Materials',
        user_id: user ? user.id : 1, // Fallback to superadmin if user missing
        description: reason || 'Desactivación manual'
      });
      return { success: true, message: 'Material desactivado.' };
    }

    // Default: Soft Delete
    material.is_active = false;
    material.deleted_at = new Date();
    await material.save();
    
    await AuditLog.create({
      entity_type: 'Material',
      entity_id: material.id.toString(),
      action: 'SOFT_DELETE',
      module: 'Materials',
      user_id: user ? user.id : 1,
      description: reason || 'Eliminación lógica'
    });

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
