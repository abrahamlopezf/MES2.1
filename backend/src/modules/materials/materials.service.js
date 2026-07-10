const { Op } = require('sequelize');

const db = require('../../database/models');
const { throwHttpError } = require('../../shared/security/accessRules');

const { MaterialCategory, Material } = db;

const isAdminLike = (user) => {
  const roleCode = user?.role?.code;
  return roleCode === 'SUPERADMIN' || roleCode === 'ADMIN';
};

const normalizeCode = (value = '') => {
  return String(value).trim().toUpperCase();
};

const buildActiveWhere = (currentUser, includeInactive) => {
  if (isAdminLike(currentUser) && includeInactive === 'true') {
    return {};
  }

  return {
    is_active: true,
  };
};

const getCategories = async ({ query = {}, currentUser }) => {
  const where = {
    ...buildActiveWhere(currentUser, query.include_inactive),
  };

  if (query.search) {
    where[Op.or] = [
      { code: { [Op.iLike]: `%${query.search}%` } },
      { name: { [Op.iLike]: `%${query.search}%` } },
      { description: { [Op.iLike]: `%${query.search}%` } },
    ];
  }

  return MaterialCategory.findAll({
    where,
    order: [
      ['is_active', 'DESC'],
      ['name', 'ASC'],
    ],
  });
};

const getCategoryById = async ({ id, currentUser }) => {
  const where = {
    id,
    ...buildActiveWhere(currentUser, 'false'),
  };

  const category = await MaterialCategory.findOne({ where });

  if (!category) {
    throwHttpError('Categoría de material no encontrada.', 404);
  }

  return category;
};

const createCategory = async ({ payload, currentUser }) => {
  const code = normalizeCode(payload.code);

  const existingCategory = await MaterialCategory.findOne({
    where: { code },
  });

  if (existingCategory) {
    throwHttpError('Ya existe una categoría con ese código.', 409);
  }

  return MaterialCategory.create({
    code,
    name: payload.name.trim(),
    description: payload.description || null,
    created_by: currentUser?.id || null,
    updated_by: currentUser?.id || null,
  });
};

const updateCategory = async ({ id, payload, currentUser }) => {
  const category = await MaterialCategory.findByPk(id);

  if (!category) {
    throwHttpError('Categoría de material no encontrada.', 404);
  }

  if (payload.code) {
    const code = normalizeCode(payload.code);

    const existingCategory = await MaterialCategory.findOne({
      where: {
        code,
        id: { [Op.ne]: id },
      },
    });

    if (existingCategory) {
      throwHttpError('Ya existe otra categoría con ese código.', 409);
    }

    category.code = code;
  }

  if (payload.name !== undefined) {
    category.name = payload.name.trim();
  }

  if (payload.description !== undefined) {
    category.description = payload.description || null;
  }

  if (payload.is_active !== undefined) {
    category.is_active = payload.is_active;
  }

  category.updated_by = currentUser?.id || null;

  await category.save();

  return category;
};

const deactivateCategory = async ({ id, currentUser }) => {
  const category = await MaterialCategory.findByPk(id);

  if (!category) {
    throwHttpError('Categoría de material no encontrada.', 404);
  }

  const activeMaterialsCount = await Material.count({
    where: {
      material_category_id: id,
      is_active: true,
    },
  });

  if (activeMaterialsCount > 0) {
    throwHttpError(
      'No se puede desactivar esta categoría porque tiene materiales activos.',
      409
    );
  }

  category.is_active = false;
  category.updated_by = currentUser?.id || null;

  await category.save();

  return category;
};

const getMaterials = async ({ query = {}, currentUser }) => {
  const where = {
    ...buildActiveWhere(currentUser, query.include_inactive),
  };

  if (query.search) {
    where[Op.or] = [
      { code: { [Op.iLike]: `%${query.search}%` } },
      { name: { [Op.iLike]: `%${query.search}%` } },
      { description: { [Op.iLike]: `%${query.search}%` } },
      { technical_notes: { [Op.iLike]: `%${query.search}%` } },
    ];
  }

  if (query.material_category_id) {
    where.material_category_id = query.material_category_id;
  }

  if (query.material_type) {
    where.material_type = query.material_type;
  }

  if (query.default_unit) {
    where.default_unit = query.default_unit;
  }

  const limit = Math.min(Number(query.limit) || 100, 300);
  const offset = Number(query.offset) || 0;

  const result = await Material.findAndCountAll({
    where,
    include: [
      {
        model: MaterialCategory,
        as: 'category',
        attributes: ['id', 'code', 'name', 'is_active'],
      },
    ],
    order: [
      ['is_active', 'DESC'],
      ['name', 'ASC'],
    ],
    limit,
    offset,
  });

  return {
    items: result.rows,
    total: result.count,
    limit,
    offset,
  };
};

const getMaterialById = async ({ id, currentUser }) => {
  const where = {
    id,
    ...buildActiveWhere(currentUser, 'false'),
  };

  const material = await Material.findOne({
    where,
    include: [
      {
        model: MaterialCategory,
        as: 'category',
        attributes: ['id', 'code', 'name', 'is_active'],
      },
    ],
  });

  if (!material) {
    throwHttpError('Material no encontrado.', 404);
  }

  return material;
};

const assertCategoryExistsAndActive = async (categoryId) => {
  const category = await MaterialCategory.findOne({
    where: {
      id: categoryId,
      is_active: true,
    },
  });

  if (!category) {
    throwHttpError('La categoría seleccionada no existe o está inactiva.', 400);
  }

  return category;
};

const createMaterial = async ({ payload, currentUser }) => {
  await assertCategoryExistsAndActive(payload.material_category_id);

  const code = normalizeCode(payload.code);

  const existingMaterial = await Material.findOne({
    where: { code },
  });

  if (existingMaterial) {
    throwHttpError('Ya existe un material con ese código.', 409);
  }

  return Material.create({
    material_category_id: payload.material_category_id,
    code,
    name: payload.name.trim(),
    material_type: payload.material_type,
    default_unit: payload.default_unit,
    description: payload.description || null,
    technical_notes: payload.technical_notes || null,
    min_stock: payload.min_stock ?? null,
    created_by: currentUser?.id || null,
    updated_by: currentUser?.id || null,
  });
};

const updateMaterial = async ({ id, payload, currentUser }) => {
  const material = await Material.findByPk(id);

  if (!material) {
    throwHttpError('Material no encontrado.', 404);
  }

  if (payload.material_category_id !== undefined) {
    await assertCategoryExistsAndActive(payload.material_category_id);
    material.material_category_id = payload.material_category_id;
  }

  if (payload.code) {
    const code = normalizeCode(payload.code);

    const existingMaterial = await Material.findOne({
      where: {
        code,
        id: { [Op.ne]: id },
      },
    });

    if (existingMaterial) {
      throwHttpError('Ya existe otro material con ese código.', 409);
    }

    material.code = code;
  }

  if (payload.name !== undefined) {
    material.name = payload.name.trim();
  }

  if (payload.material_type !== undefined) {
    material.material_type = payload.material_type;
  }

  if (payload.default_unit !== undefined) {
    material.default_unit = payload.default_unit;
  }

  if (payload.description !== undefined) {
    material.description = payload.description || null;
  }

  if (payload.technical_notes !== undefined) {
    material.technical_notes = payload.technical_notes || null;
  }

  if (payload.min_stock !== undefined) {
    material.min_stock = payload.min_stock;
  }

  if (payload.is_active !== undefined) {
    material.is_active = payload.is_active;
  }

  material.updated_by = currentUser?.id || null;

  await material.save();

  return getMaterialById({ id, currentUser });
};

const deactivateMaterial = async ({ id, currentUser }) => {
  const material = await Material.findByPk(id);

  if (!material) {
    throwHttpError('Material no encontrado.', 404);
  }

  material.is_active = false;
  material.updated_by = currentUser?.id || null;

  await material.save();

  return getMaterialById({ id, currentUser });
};

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deactivateCategory,
  getMaterials,
  getMaterialById,
  createMaterial,
  updateMaterial,
  deactivateMaterial,
};