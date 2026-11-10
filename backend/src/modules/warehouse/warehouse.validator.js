const Joi = require('joi');

const receiveMaterialSchema = Joi.object({
  qr_code: Joi.string().trim().required(),
  material_id: Joi.number().integer().positive().required(),
  quantity: Joi.number().precision(3).positive().required(),
  location: Joi.string().trim().max(100).required(),
});

const consumptionOrderSchema = Joi.object({
  requesting_area_id: Joi.number().integer().positive().required(),
  items: Joi.array().items(Joi.object({
    material_id: Joi.number().integer().positive().required(),
    quantity: Joi.number().positive().precision(4).required(),
  }).unknown(false)).min(1).max(100).required(),
  notes: Joi.string().trim().max(1000).allow('', null).optional(),
}).unknown(false);

module.exports = {
  receiveMaterialSchema,
  consumptionOrderSchema,
};
