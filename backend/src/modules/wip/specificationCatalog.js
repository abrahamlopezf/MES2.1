'use strict';

const { Op } = require('sequelize');
const rollTransformation = require('./rollTransformation');
const { sequelize, ProductionBom } = require('../../database/models');

const nullableNumber = (value) => value === '' || value === undefined ? null : value;

const validateBoms = async (requirements = {}) => {
  const ids = [...new Set((Array.isArray(requirements.allowed_bom_ids) ? requirements.allowed_bom_ids : []).map(Number))];
  if (!ids.length) return;
  const count = await ProductionBom.count({ where: { id: { [Op.in]: ids }, is_active: true } });
  if (count !== ids.length) throw Object.assign(new Error('La ficha incluye una ficha de Telares inexistente o inactiva.'), { statusCode: 400, code: 'INVALID_SPECIFICATION_BOM' });
};

const assertUnique = async (Model, field, value, excludeId = null) => {
  const normalized = String(value || '').trim().toUpperCase();
  if (!normalized) return;
  const where = { [field]: { [Op.iLike]: normalized } };
  if (excludeId) where.id = { [Op.ne]: excludeId };
  if (await Model.findOne({ where })) throw Object.assign(new Error(`El código "${value}" ya está en uso en otra ficha de esta área.`), { statusCode: 409, code: 'DUPLICATE_AREA_PTI' });
};

const create = async ({ Model, MaterialModel, foreignKey, area, payload, user, canViewCosts }) => {
  const draft = payload.is_active !== true;
  if (draft) rollTransformation.validateSpecificationDraftPayload(payload, area);
  else rollTransformation.validateSpecificationPayload(payload, area);
  const materials = payload.materials || [];
  await rollTransformation.validateRecipeMaterialUnits(materials);
  await validateBoms(payload.loom_roll_requirements);
  await assertUnique(Model, 'code', payload.code);
  await assertUnique(Model, 'output_pti_code', payload.output_pti_code);

  return sequelize.transaction(async (transaction) => {
    const allowed = ['code', 'name', 'description', 'output_pti_code', 'process_type', 'lamination_type', 'target_width_cm', 'target_grammage_g_per_m', 'coating_grammage_g_per_m2', 'output_product_name', 'expected_output_quantity', 'expected_output_unit', 'standard_output_meters', 'standard_waste_percentage', 'cost_transformation_index', 'loom_roll_requirements'];
    const fields = Object.fromEntries(allowed.filter((key) => payload[key] !== undefined).map((key) => [key, payload[key]]));
    for (const key of ['target_width_cm', 'target_grammage_g_per_m', 'coating_grammage_g_per_m2', 'expected_output_quantity', 'standard_output_meters', 'standard_waste_percentage', 'cost_transformation_index']) {
      if (fields[key] !== undefined) fields[key] = nullableNumber(fields[key]);
    }
    fields.code = String(payload.code).trim().toUpperCase();
    fields.output_pti_code = String(payload.output_pti_code).trim().toUpperCase();
    fields.name = String(payload.name).trim();
    fields.configuration_status = draft ? 'BORRADOR' : 'ACTIVA';
    fields.is_active = !draft;
    if (!canViewCosts(user)) fields.cost_transformation_index = null;
    const spec = await Model.create(fields, { transaction });
    for (const item of materials) {
      if (!item.material_id) continue;
      await MaterialModel.create({
        [foreignKey]: spec.id,
        material_id: item.material_id,
        quantity: item.quantity,
        unit: item.unit || 'KG',
        notes: item.notes || null,
      }, { transaction });
    }
    return spec;
  });
};

const update = async ({ Model, MaterialModel, foreignKey, id, area, payload, user, canViewCosts }) => sequelize.transaction(async (transaction) => {
  const spec = await Model.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
  if (!spec) throw Object.assign(new Error(`Ficha de ${area} #${id} no encontrada.`), { statusCode: 404 });
  const effective = { ...spec.toJSON(), ...payload, loom_roll_requirements: payload.loom_roll_requirements ?? spec.loom_roll_requirements };
  const isActive = payload.is_active === undefined ? spec.is_active : payload.is_active === true;
  if (isActive) rollTransformation.validateSpecificationPayload(effective, area);
  else rollTransformation.validateSpecificationDraftPayload(effective, area);
  if (Array.isArray(payload.materials)) await rollTransformation.validateRecipeMaterialUnits(payload.materials);
  await validateBoms(effective.loom_roll_requirements);
  await assertUnique(Model, 'code', effective.code, id);
  await assertUnique(Model, 'output_pti_code', effective.output_pti_code, id);

  const allowed = ['code', 'name', 'description', 'output_pti_code', 'configuration_status', 'is_active', 'loom_roll_requirements', 'target_width_cm', 'expected_output_quantity', 'expected_output_unit', 'standard_output_meters', 'standard_waste_percentage', 'cost_transformation_index'];
  allowed.push(area === 'GLOBO' ? 'process_type' : 'lamination_type');
  allowed.push(area === 'GLOBO' ? 'target_grammage_g_per_m' : 'coating_grammage_g_per_m2');
  for (const field of allowed) {
    if (payload[field] === undefined) continue;
    if (field === 'cost_transformation_index' && !canViewCosts(user)) continue;
    spec[field] = payload[field];
  }
  spec.code = String(spec.code).trim().toUpperCase();
  spec.output_pti_code = String(spec.output_pti_code).trim().toUpperCase();
  spec.configuration_status = isActive ? 'ACTIVA' : 'BORRADOR';
  spec.is_active = isActive;
  for (const field of ['target_width_cm', 'target_grammage_g_per_m', 'coating_grammage_g_per_m2', 'expected_output_quantity', 'standard_output_meters', 'standard_waste_percentage', 'cost_transformation_index']) {
    if (spec[field] === '') spec[field] = null;
  }
  await spec.save({ transaction });

  if (Array.isArray(payload.materials)) {
    await MaterialModel.destroy({ where: { [foreignKey]: id }, transaction });
    for (const item of payload.materials) if (item.material_id) await MaterialModel.create({
      [foreignKey]: id, material_id: item.material_id, quantity: item.quantity, unit: item.unit || 'KG', notes: item.notes || null,
    }, { transaction });
  }
  return spec;
});

const activate = async ({ Model, MaterialModel, id, area }) => {
  const spec = await Model.findByPk(id, { include: [{ model: MaterialModel, as: 'materials' }] });
  if (!spec) throw Object.assign(new Error(`Ficha de ${area} #${id} no encontrada.`), { statusCode: 404 });
  const nextActive = !spec.is_active;
  if (nextActive) {
    rollTransformation.validateSpecificationPayload(spec.toJSON(), area);
    await rollTransformation.validateRecipeMaterialUnits(spec.materials || []);
  }
  spec.is_active = nextActive;
  spec.configuration_status = nextActive ? 'ACTIVA' : 'BORRADOR';
  await spec.save();
  return { id: spec.id, is_active: spec.is_active, configuration_status: spec.configuration_status, message: nextActive ? `PTI ${spec.output_pti_code} activado.` : `PTI ${spec.output_pti_code} desactivado.` };
};

module.exports = { create, update, activate };
