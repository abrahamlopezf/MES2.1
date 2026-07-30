const Joi = require('joi');

const receiveMaterialSchema = Joi.object({
  qr_code: Joi.string().trim().required(),
  material_id: Joi.number().integer().positive().required(),
  quantity: Joi.number().precision(3).positive().required(),
  location: Joi.string().trim().max(100).required(),
});

module.exports = {
  receiveMaterialSchema,
};
