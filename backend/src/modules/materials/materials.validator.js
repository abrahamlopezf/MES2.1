const Joi = require('joi');

const createCategorySchema = Joi.object({
  code: Joi.string().trim().uppercase().max(40).required(),
  name: Joi.string().trim().max(120).required(),
  description: Joi.string().trim().allow('', null).optional(),
});

const updateCategorySchema = Joi.object({
  code: Joi.string().trim().uppercase().max(40).optional(),
  name: Joi.string().trim().max(120).optional(),
  description: Joi.string().trim().allow('', null).optional(),
  is_active: Joi.boolean().optional(),
}).min(1);

const createMaterialSchema = Joi.object({
  material_category_id: Joi.number().integer().positive().required(),
  code: Joi.string().trim().uppercase().max(60).required(),
  name: Joi.string().trim().max(160).required(),
  subcategory_id: Joi.number().integer().positive().allow(null).optional(),
  unit_id: Joi.number().integer().positive().allow(null).optional(),
  description: Joi.string().trim().allow('', null).optional(),
  technical_notes: Joi.string().trim().allow('', null).optional(),
  min_stock: Joi.number().precision(3).min(0).allow(null).optional(),
});

const updateMaterialSchema = Joi.object({
  material_category_id: Joi.number().integer().positive().optional(),
  code: Joi.string().trim().uppercase().max(60).optional(),
  name: Joi.string().trim().max(160).optional(),
  subcategory_id: Joi.number().integer().positive().allow(null).optional(),
  unit_id: Joi.number().integer().positive().allow(null).optional(),
  description: Joi.string().trim().allow('', null).optional(),
  technical_notes: Joi.string().trim().allow('', null).optional(),
  min_stock: Joi.number().precision(3).min(0).allow(null).optional(),
  is_active: Joi.boolean().optional(),
}).min(1);

module.exports = {
  createCategorySchema,
  updateCategorySchema,
  createMaterialSchema,
  updateMaterialSchema,
};