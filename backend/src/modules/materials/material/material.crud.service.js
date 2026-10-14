const { Material, MaterialFamily, MaterialCode, MaterialBrand, MaterialType, Location, Tag } = require('../../../database/models');
const { NotFoundError } = require('../../../services/BaseCatalogService');

class MaterialCrudService {
  
  async create(data) {
    const createdCatalogs = [];

    // 1. Resolver o Crear Familia
    let family = null;
    if (data.family_uuid) {
      family = await MaterialFamily.findOne({ where: { uuid: data.family_uuid } });
    }

    if (!family && data.new_family_name) {
      const raw = String(data.new_family_name).trim();
      let famCode = '';
      let famName = '';
      if (raw.includes('-')) {
        const parts = raw.split('-');
        famCode = parts[0].trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        famName = parts.slice(1).join('-').trim().toUpperCase();
      } else {
        famName = raw.toUpperCase();
        const words = famName.split(/\s+/).filter(Boolean);
        if (words.length > 1) {
          famCode = words.map(w => w[0]).join('').slice(0, 4).toUpperCase();
        } else {
          famCode = famName.replace(/[^A-Z0-9]/g, '').slice(0, 4).toUpperCase();
        }
      }
      if (!famCode) famCode = 'FAM';

      let existingFamily = await MaterialFamily.findOne({ 
        where: { name: famName },
        paranoid: false 
      });

      if (existingFamily) {
        if (existingFamily.deleted_at) {
          await existingFamily.restore();
          await existingFamily.update({ is_active: true });
        }
        family = existingFamily;
      } else {
        let finalCode = famCode;
        let counter = 1;
        while (await MaterialFamily.findOne({ where: { code: finalCode }, paranoid: false })) {
          finalCode = `${famCode}${counter}`;
          counter++;
        }

        family = await MaterialFamily.create({
          code: finalCode,
          name: famName || raw,
          is_active: true
        });

        createdCatalogs.push({
          type: 'family',
          catalog: 'Familias',
          name: family.name,
          code: family.code,
          path: '/materials/families'
        });
      }
    }

    if (!family) {
      const err = new Error('Familia de material no encontrada ni especificada.');
      err.name = 'BusinessRuleError';
      throw err;
    }

    // 2. Resolver o Crear Artículo / Consecutivo (MaterialCode)
    let code = null;
    if (data.material_code_uuid) {
      code = await MaterialCode.findOne({ where: { uuid: data.material_code_uuid } });
    }

    // Si no viene material_code_uuid o no se encontró, pero se envió article_code (unificación inteligente)
    if (!code && data.article_code) {
      const normalizedCode = String(data.article_code).trim().toUpperCase();
      code = await MaterialCode.findOne({ 
        where: { code: normalizedCode },
        paranoid: false 
      });

      if (code && code.deleted_at) {
        await code.restore();
        const articleName = (data.article_name || data.name || normalizedCode).trim().toUpperCase();
        await code.update({ name: articleName, is_active: true });
      } else if (!code) {
        // Crear automáticamente el registro en material_codes
        const articleName = (data.article_name || data.name || normalizedCode).trim().toUpperCase();
        code = await MaterialCode.create({
          code: normalizedCode,
          name: articleName,
          description: data.description || null,
          is_active: true
        });
        createdCatalogs.push({
          type: 'code',
          catalog: 'Artículos',
          name: code.name,
          code: code.code,
          path: '/materials/codes'
        });
      }
    }
    
    if (!code) {
      const err = new Error('Artículo / Consecutivo no especificado o inválido.');
      err.name = 'BusinessRuleError';
      throw err;
    }

    // 3. Resolver o Crear Marca (MaterialBrand)
    let brandId = null;
    if (data.brand_uuid) {
      const brand = await MaterialBrand.findOne({ where: { uuid: data.brand_uuid } });
      if (brand) brandId = brand.id;
    }

    if (!brandId && data.new_brand_name) {
      const rawBrand = String(data.new_brand_name).trim().toUpperCase();
      let brandCode = rawBrand.replace(/[^A-Z0-9]/g, '_').slice(0, 20);
      let existingBrand = await MaterialBrand.findOne({ where: { name: rawBrand }, paranoid: false });
      if (!existingBrand) {
        existingBrand = await MaterialBrand.findOne({ where: { code: brandCode }, paranoid: false });
      }

      if (existingBrand) {
        if (existingBrand.deleted_at) await existingBrand.restore();
        brandId = existingBrand.id;
      } else {
        let finalBrandCode = brandCode || 'BRAND';
        let counter = 1;
        while (await MaterialBrand.findOne({ where: { code: finalBrandCode }, paranoid: false })) {
          finalBrandCode = `${brandCode.slice(0, 16)}_${counter}`;
          counter++;
        }
        const newBrand = await MaterialBrand.create({
          code: finalBrandCode,
          name: rawBrand,
          is_active: true
        });
        brandId = newBrand.id;
        createdCatalogs.push({
          type: 'brand',
          catalog: 'Marcas',
          name: newBrand.name,
          code: newBrand.code,
          path: '/materials/brands'
        });
      }
    }

    // 4. Resolver o Crear Tipo de Material (MaterialType)
    let typeId = null;
    if (data.type_uuid) {
      const type = await MaterialType.findOne({ where: { uuid: data.type_uuid } });
      if (type) typeId = type.id;
    }

    if (!typeId && data.new_type_name) {
      const rawType = String(data.new_type_name).trim().toUpperCase();
      let typeCode = rawType.replace(/[^A-Z0-9]/g, '_').slice(0, 20);
      let existingType = await MaterialType.findOne({ where: { name: rawType }, paranoid: false });
      if (!existingType) {
        existingType = await MaterialType.findOne({ where: { code: typeCode }, paranoid: false });
      }

      if (existingType) {
        if (existingType.deleted_at) await existingType.restore();
        typeId = existingType.id;
      } else {
        let finalTypeCode = typeCode || 'TYPE';
        let counter = 1;
        while (await MaterialType.findOne({ where: { code: finalTypeCode }, paranoid: false })) {
          finalTypeCode = `${typeCode.slice(0, 16)}_${counter}`;
          counter++;
        }
        const newType = await MaterialType.create({
          code: finalTypeCode,
          name: rawType,
          is_active: true
        });
        typeId = newType.id;
        createdCatalogs.push({
          type: 'type',
          catalog: 'Tipos de Material',
          name: newType.name,
          code: newType.code,
          path: '/materials/types'
        });
      }
    }
    
    // 5. Resolver o Crear Unidad Base (MaterialUnit)
    let baseUnitId = null;
    const { MaterialUnit, MaterialRanking } = require('../../../database/models');
    if (data.base_unit_uuid) {
      const unit = await MaterialUnit.findByPk(data.base_unit_uuid);
      if (unit) baseUnitId = unit.id;
    }

    if (!baseUnitId && data.new_unit_name) {
      const rawUnit = String(data.new_unit_name).trim().toUpperCase();
      let unitCode = '';
      let unitName = '';
      if (rawUnit.includes('-')) {
        const parts = rawUnit.split('-');
        unitCode = parts[0].trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
        unitName = parts.slice(1).join('-').trim().toUpperCase();
      } else {
        unitName = rawUnit;
        unitCode = rawUnit.slice(0, 5);
      }
      if (!unitCode) unitCode = 'UND';

      let existingUnit = await MaterialUnit.findOne({ where: { name: unitName } });
      if (!existingUnit) {
        existingUnit = await MaterialUnit.findOne({ where: { code: unitCode } });
      }

      if (existingUnit) {
        baseUnitId = existingUnit.id;
      } else {
        let finalUnitCode = unitCode;
        let counter = 1;
        while (await MaterialUnit.findOne({ where: { code: finalUnitCode } })) {
          finalUnitCode = `${unitCode.slice(0, 7)}${counter}`;
          counter++;
        }
        const newUnit = await MaterialUnit.create({
          code: finalUnitCode,
          name: unitName,
          is_active: true
        });
        baseUnitId = newUnit.id;
        createdCatalogs.push({
          type: 'unit',
          catalog: 'Unidades de Medida',
          name: newUnit.name,
          code: newUnit.code,
          path: '/materials/units'
        });
      }
    }
    
    // 6. Localidad sugerida
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

    // 7. Resolver ranking_id
    let rankingId = data.ranking_id;
    if (!rankingId && MaterialRanking) {
      const matchedRanking = await MaterialRanking.findOne({ where: { nomenclature: family.code } });
      if (matchedRanking) {
        rankingId = matchedRanking.id;
      } else {
        const firstRanking = await MaterialRanking.findOne();
        if (firstRanking) rankingId = firstRanking.id;
      }
    }

    // 8. Generar internal_consecutive (Búsqueda del último consecutivo)
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

    // 9. Generar internal_code
    const internal_code = `${family.code}-${code.code}-${internal_consecutive}`.replace(/--+/g, '-');

    // 10. Crear registro
    const materialData = {
      family_id: family.id,
      material_code_id: code.id,
      brand_id: brandId,
      type_id: typeId,
      ranking_id: rankingId,
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
      const resolvedTagIds = await this._resolveTags(data.tags, createdCatalogs);
      await material.setTags(resolvedTagIds);
    }

    material.dataValues.created_catalogs = createdCatalogs;
    material.created_catalogs = createdCatalogs;

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
      const resolvedTagIds = await this._resolveTags(data.tags);
      await material.setTags(resolvedTagIds);
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

  async _resolveTags(tags, createdCatalogs = null) {
    if (!tags || !Array.isArray(tags)) return [];
    const resolvedIds = [];
    const tagColors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4'];

    for (const item of tags) {
      if (!item) continue;
      const strItem = String(item).trim();
      const isNew = strItem.startsWith('NEW:');
      const tagName = isNew ? strItem.replace('NEW:', '').trim().toUpperCase() : null;

      if (isNew && tagName) {
        let tag = await Tag.findOne({ where: { name: tagName }, paranoid: false });
        if (tag) {
          if (tag.deleted_at) {
            await tag.restore();
            await tag.update({ is_active: true });
          }
        } else {
          const randomColor = tagColors[Math.floor(Math.random() * tagColors.length)];
          tag = await Tag.create({
            name: tagName,
            color: randomColor,
            description: 'Etiqueta creada automáticamente desde formulario de material',
            is_active: true
          });
          if (createdCatalogs) {
            createdCatalogs.push({
              type: 'tag',
              catalog: 'Etiquetas',
              entity: 'Etiquetas',
              name: tag.name,
              code: tag.name,
              uuid: tag.uuid,
              path: '/materials/tags'
            });
          }
        }
        resolvedIds.push(tag.id);
      } else {
        let tag = null;
        if (strItem.includes('-') && strItem.length >= 32) {
          tag = await Tag.findOne({ where: { uuid: strItem } });
        } else if (/^\d+$/.test(strItem)) {
          tag = await Tag.findByPk(parseInt(strItem, 10));
        } else {
          tag = await Tag.findOne({ where: { name: strItem } });
        }
        if (tag) {
          resolvedIds.push(tag.id);
        }
      }
    }
    return resolvedIds;
  }
}

module.exports = new MaterialCrudService();
