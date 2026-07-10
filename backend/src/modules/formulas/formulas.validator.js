const Joi = require('joi');

const formulaItemSchema = Joi.object({
  material_id: Joi.number().integer().positive().required(),
  material_role: Joi.string()
    .valid('BASE', 'SECONDARY', 'PIGMENT', 'ADDITIVE', 'RECYCLED', 'OTHER')
    .required(),
  calculation_type: Joi.string()
    .valid('FIXED_QUANTITY', 'PERCENTAGE')
    .default('FIXED_QUANTITY'),
  quantity: Joi.number().positive().allow(null),
  percentage: Joi.number().positive().max(100).allow(null),
  unit: Joi.string().trim().uppercase().max(20).required(),
  tolerance_min: Joi.number().min(0).allow(null),
  tolerance_max: Joi.number().min(0).allow(null),
  sort_order: Joi.number().integer().positive().default(1),
  is_required: Joi.boolean().default(true),
});

const createFormulaSchema = Joi.object({
  code: Joi.string().trim().uppercase().max(80).required(),
  name: Joi.string().trim().max(150).required(),
  description: Joi.string().trim().allow(null, ''),
  target_area_id: Joi.number().integer().positive().required(),
  target_intermediate_material_id: Joi.number().integer().positive().allow(null),
  version: Joi.number().integer().positive().default(1),
  status: Joi.string().valid('BORRADOR', 'ACTIVA', 'INACTIVA').default('ACTIVA'),
  is_active: Joi.boolean().default(true),
  items: Joi.array().items(formulaItemSchema).min(1).required(),
});

const updateFormulaSchema = Joi.object({
  code: Joi.string().trim().uppercase().max(80),
  name: Joi.string().trim().max(150),
  description: Joi.string().trim().allow(null, ''),
  target_area_id: Joi.number().integer().positive(),
  target_intermediate_material_id: Joi.number().integer().positive().allow(null),
  version: Joi.number().integer().positive(),
  status: Joi.string().valid('BORRADOR', 'ACTIVA', 'INACTIVA'),
  is_active: Joi.boolean(),
  items: Joi.array().items(formulaItemSchema).min(1),
}).min(1);

const validateCreateFormula = (payload) =>
  createFormulaSchema.validate(payload, {
    abortEarly: false,
    stripUnknown: true,
  });

const validateUpdateFormula = (payload) =>
  updateFormulaSchema.validate(payload, {
    abortEarly: false,
    stripUnknown: true,
  });

module.exports = {
  validateCreateFormula,
  validateUpdateFormula,
};