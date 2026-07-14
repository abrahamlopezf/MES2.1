const Joi = require('joi');

const receptionSchema = Joi.object({
  qr_code: Joi.string().required().messages({
    'string.empty': 'El código QR es obligatorio.',
    'any.required': 'El código QR es obligatorio.',
  }),
  material_id: Joi.number().integer().positive().required().messages({
    'number.base': 'El ID del material debe ser un número.',
    'any.required': 'El ID del material es obligatorio.',
  }),
  quantity: Joi.number().positive().required().messages({
    'number.base': 'La cantidad debe ser un número válido.',
    'number.positive': 'La cantidad debe ser mayor a cero.',
    'any.required': 'La cantidad es obligatoria.',
  }),
  supplier_lot: Joi.string().max(100).allow(null, '').optional(),
  supplier_reference: Joi.string().max(150).allow(null, '').optional(),
  location: Joi.string().max(150).allow(null, '').optional(),
  notes: Joi.string().allow(null, '').optional(),
});

module.exports = {
  receptionSchema,
};
