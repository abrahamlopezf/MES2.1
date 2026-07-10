const { Op } = require('sequelize');

const db = require('../../database/models');
const auditService = require('../audit/audit.service');

const {
  validateCreateFormula,
  validateUpdateFormula,
} = require('./formulas.validator');

const normalizeJoiError = (error) =>
  error.details.map((detail) => detail.message).join(', ');

const buildFormulaDto = (formula) => {
  if (!formula) return null;

  const plain = formula.get ? formula.get({ plain: true }) : formula;

  return {
    id: plain.id,
    code: plain.code,
    name: plain.name,
    description: plain.description,
    target_area_id: plain.target_area_id,
    target_area: plain.target_area || null,
    target_intermediate_material_id: plain.target_intermediate_material_id,
    version: plain.version,
    status: plain.status,
    is_active: plain.is_active,
    items: (plain.items || []).map((item) => ({
      id: item.id,
      material_id: item.material_id,
      material: item.material || null,
      material_role: item.material_role,
      calculation_type: item.calculation_type,
      quantity: item.quantity,
      percentage: item.percentage,
      unit: item.unit,
      tolerance_min: item.tolerance_min,
      tolerance_max: item.tolerance_max,
      sort_order: item.sort_order,
      is_required: item.is_required,
    })),
    created_at: plain.created_at || plain.createdAt,
    updated_at: plain.updated_at || plain.updatedAt,
  };
};

const getFormulaInclude = () => [
  {
    model: db.Area,
    as: 'target_area',
    attributes: ['id', 'code', 'name', 'is_active'],
    required: false,
  },
  {
    model: db.ProcessFormulaItem,
    as: 'items',
    required: false,
    include: [
      {
        model: db.Material,
        as: 'material',
        attributes: [
          'id',
          'code',
          'name',
          'material_type',
          'default_unit',
          'is_active',
        ],
        required: false,
      },
    ],
  },
];

const listFormulas = async ({ query = {} }) => {
  const where = {};

  if (query.search) {
    const search = String(query.search).trim();

    where[Op.or] = [
      { code: { [Op.iLike]: `%${search}%` } },
      { name: { [Op.iLike]: `%${search}%` } },
    ];
  }

  if (query.status) {
    where.status = String(query.status).trim().toUpperCase();
  }

  if (query.is_active !== undefined) {
    where.is_active = String(query.is_active) === 'true';
  }

  if (query.target_area_id) {
    where.target_area_id = Number(query.target_area_id);
  }

  const formulas = await db.ProcessFormula.findAll({
    where,
    include: getFormulaInclude(),
    order: [
      ['is_active', 'DESC'],
      ['code', 'ASC'],
      [{ model: db.ProcessFormulaItem, as: 'items' }, 'sort_order', 'ASC'],
    ],
  });

  return formulas.map(buildFormulaDto);
};

const getFormulaById = async ({ id }) => {
  const formula = await db.ProcessFormula.findByPk(id, {
    include: getFormulaInclude(),
  });

  if (!formula) {
    const error = new Error('Fórmula no encontrada.');
    error.statusCode = 404;
    throw error;
  }

  return buildFormulaDto(formula);
};

const createFormula = async ({ payload, user, req }) => {
  const { error, value } = validateCreateFormula(payload);

  if (error) {
    const validationError = new Error(normalizeJoiError(error));
    validationError.statusCode = 400;
    throw validationError;
  }

  return db.sequelize.transaction(async (transaction) => {
    const targetArea = await db.Area.findByPk(value.target_area_id, {
      transaction,
    });

    if (!targetArea) {
      const err = new Error('El área destino de la fórmula no existe.');
      err.statusCode = 404;
      throw err;
    }

    if (targetArea.is_active === false) {
      const err = new Error('El área destino de la fórmula está inactiva.');
      err.statusCode = 400;
      throw err;
    }

    const existingFormula = await db.ProcessFormula.findOne({
      where: {
        code: value.code,
      },
      transaction,
    });

    if (existingFormula) {
      const err = new Error('Ya existe una fórmula con ese código.');
      err.statusCode = 409;
      throw err;
    }

    const materialIds = value.items.map((item) => item.material_id);

    const materials = await db.Material.findAll({
      where: {
        id: {
          [Op.in]: materialIds,
        },
      },
      transaction,
    });

    if (materials.length !== materialIds.length) {
      const err = new Error('Uno o más materiales de la fórmula no existen.');
      err.statusCode = 400;
      throw err;
    }

    const inactiveMaterial = materials.find((material) => material.is_active === false);

    if (inactiveMaterial) {
      const err = new Error(
        `El material ${inactiveMaterial.code || inactiveMaterial.id} está inactivo.`
      );
      err.statusCode = 400;
      throw err;
    }

    const formula = await db.ProcessFormula.create(
      {
        code: value.code,
        name: value.name,
        description: value.description || null,
        target_area_id: value.target_area_id,
        target_intermediate_material_id:
          value.target_intermediate_material_id || null,
        version: value.version,
        status: value.status,
        is_active: value.is_active,
        created_by: user?.id || null,
        updated_by: user?.id || null,
      },
      { transaction }
    );

    const itemsPayload = value.items.map((item, index) => ({
      formula_id: formula.id,
      material_id: item.material_id,
      material_role: item.material_role,
      calculation_type: item.calculation_type,
      quantity: item.quantity || null,
      percentage: item.percentage || null,
      unit: item.unit,
      tolerance_min: item.tolerance_min || null,
      tolerance_max: item.tolerance_max || null,
      sort_order: item.sort_order || index + 1,
      is_required: item.is_required,
    }));

    await db.ProcessFormulaItem.bulkCreate(itemsPayload, { transaction });

    const createdFormula = await db.ProcessFormula.findByPk(formula.id, {
      include: getFormulaInclude(),
      transaction,
    });

    const dto = buildFormulaDto(createdFormula);

    await auditService.createAuditLog({
      user,
      action: 'CREATE_PROCESS_FORMULA',
      entityType: 'ProcessFormula',
      entityId: formula.id,
      module: 'Traceability',
      description: `Creó la fórmula ${formula.code} - ${formula.name}.`,
      beforeData: null,
      afterData: dto,
      metadata: {
        formula_code: formula.code,
        target_area_id: formula.target_area_id,
      },
      req,
      transaction,
    });

    return dto;
  });
};

const updateFormula = async ({ id, payload, user, req }) => {
  const { error, value } = validateUpdateFormula(payload);

  if (error) {
    const validationError = new Error(normalizeJoiError(error));
    validationError.statusCode = 400;
    throw validationError;
  }

  return db.sequelize.transaction(async (transaction) => {
    const formula = await db.ProcessFormula.findByPk(id, {
      include: getFormulaInclude(),
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!formula) {
      const err = new Error('Fórmula no encontrada.');
      err.statusCode = 404;
      throw err;
    }

    const beforeData = buildFormulaDto(formula);

    if (value.target_area_id) {
      const targetArea = await db.Area.findByPk(value.target_area_id, {
        transaction,
      });

      if (!targetArea) {
        const err = new Error('El área destino de la fórmula no existe.');
        err.statusCode = 404;
        throw err;
      }

      if (targetArea.is_active === false) {
        const err = new Error('El área destino de la fórmula está inactiva.');
        err.statusCode = 400;
        throw err;
      }
    }

    if (value.code && value.code !== formula.code) {
      const existingFormula = await db.ProcessFormula.findOne({
        where: {
          code: value.code,
          id: {
            [Op.ne]: formula.id,
          },
        },
        transaction,
      });

      if (existingFormula) {
        const err = new Error('Ya existe otra fórmula con ese código.');
        err.statusCode = 409;
        throw err;
      }
    }

    await formula.update(
      {
        code: value.code ?? formula.code,
        name: value.name ?? formula.name,
        description:
          value.description !== undefined ? value.description || null : formula.description,
        target_area_id: value.target_area_id ?? formula.target_area_id,
        target_intermediate_material_id:
          value.target_intermediate_material_id !== undefined
            ? value.target_intermediate_material_id || null
            : formula.target_intermediate_material_id,
        version: value.version ?? formula.version,
        status: value.status ?? formula.status,
        is_active:
          value.is_active !== undefined ? value.is_active : formula.is_active,
        updated_by: user?.id || null,
      },
      { transaction }
    );

    if (value.items) {
      const materialIds = value.items.map((item) => item.material_id);

      const materials = await db.Material.findAll({
        where: {
          id: {
            [Op.in]: materialIds,
          },
        },
        transaction,
      });

      if (materials.length !== materialIds.length) {
        const err = new Error('Uno o más materiales de la fórmula no existen.');
        err.statusCode = 400;
        throw err;
      }

      await db.ProcessFormulaItem.destroy({
        where: {
          formula_id: formula.id,
        },
        transaction,
      });

      const itemsPayload = value.items.map((item, index) => ({
        formula_id: formula.id,
        material_id: item.material_id,
        material_role: item.material_role,
        calculation_type: item.calculation_type,
        quantity: item.quantity || null,
        percentage: item.percentage || null,
        unit: item.unit,
        tolerance_min: item.tolerance_min || null,
        tolerance_max: item.tolerance_max || null,
        sort_order: item.sort_order || index + 1,
        is_required: item.is_required,
      }));

      await db.ProcessFormulaItem.bulkCreate(itemsPayload, { transaction });
    }

    const updatedFormula = await db.ProcessFormula.findByPk(formula.id, {
      include: getFormulaInclude(),
      transaction,
    });

    const afterData = buildFormulaDto(updatedFormula);

    await auditService.createAuditLog({
      user,
      action: 'UPDATE_PROCESS_FORMULA',
      entityType: 'ProcessFormula',
      entityId: formula.id,
      module: 'Traceability',
      description: `Actualizó la fórmula ${afterData.code} - ${afterData.name}.`,
      beforeData,
      afterData,
      metadata: {
        formula_code: afterData.code,
      },
      req,
      transaction,
    });

    return afterData;
  });
};

const deactivateFormula = async ({ id, user, req }) => {
  return db.sequelize.transaction(async (transaction) => {
    const formula = await db.ProcessFormula.findByPk(id, {
      include: getFormulaInclude(),
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!formula) {
      const err = new Error('Fórmula no encontrada.');
      err.statusCode = 404;
      throw err;
    }

    const beforeData = buildFormulaDto(formula);

    await formula.update(
      {
        is_active: false,
        status: 'INACTIVA',
        updated_by: user?.id || null,
      },
      { transaction }
    );

    const updatedFormula = await db.ProcessFormula.findByPk(formula.id, {
      include: getFormulaInclude(),
      transaction,
    });

    const afterData = buildFormulaDto(updatedFormula);

    await auditService.createAuditLog({
      user,
      action: 'DEACTIVATE_PROCESS_FORMULA',
      entityType: 'ProcessFormula',
      entityId: formula.id,
      module: 'Traceability',
      description: `Desactivó la fórmula ${formula.code} - ${formula.name}.`,
      beforeData,
      afterData,
      req,
      transaction,
    });

    return afterData;
  });
};

module.exports = {
  listFormulas,
  getFormulaById,
  createFormula,
  updateFormula,
  deactivateFormula,
};