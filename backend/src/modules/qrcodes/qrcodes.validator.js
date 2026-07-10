const Joi = require('joi');

const generateQrBatchSchema = Joi.object({
  quantity: Joi.number().integer().min(1).max(50000).required().messages({
    'number.base': 'La cantidad debe ser numérica.',
    'number.min': 'Debes generar al menos 1 código QR.',
    'number.max': 'No puedes generar más de 50,000 códigos QR por lote.',
    'any.required': 'La cantidad es obligatoria.',
  }),
  assigned_area_id: Joi.number().integer().positive().allow(null).optional(),
  notes: Joi.string().allow('', null).max(500).optional(),
});

const assignQrCodesSchema = Joi.object({
  area_id: Joi.number().integer().positive().required().messages({
    'any.required': 'El área destino es obligatoria.',
  }),
  batch_id: Joi.number().integer().positive().optional(),
  quantity: Joi.number().integer().min(1).optional(),
  qr_code_ids: Joi.array().items(Joi.number().integer().positive()).optional(),
}).custom((value, helpers) => {
  const hasBatch = Boolean(value.batch_id);
  const hasQrIds = Array.isArray(value.qr_code_ids) && value.qr_code_ids.length > 0;

  if (!hasBatch && !hasQrIds) {
    return helpers.error('any.custom', {
      message: 'Debes indicar un lote o una lista de códigos QR.',
    });
  }

  if (hasBatch && !value.quantity) {
    return helpers.error('any.custom', {
      message: 'Cuando asignas por lote debes indicar la cantidad.',
    });
  }

  return value;
}).messages({
  'any.custom': '{{#message}}',
});

const validateQrSchema = Joi.object({
  qr_code: Joi.string().trim().min(3).max(120).required().messages({
    'any.required': 'El código QR es obligatorio.',
  }),
  area_id: Joi.number().integer().positive().allow(null).optional(),
  require_available: Joi.boolean().default(true),
});

const cancelQrSchema = Joi.object({
  reason: Joi.string().trim().min(5).max(500).required().messages({
    'string.min': 'Indica un motivo de cancelación más claro.',
    'any.required': 'El motivo de cancelación es obligatorio.',
  }),
});

module.exports = {
  generateQrBatchSchema,
  assignQrCodesSchema,
  validateQrSchema,
  cancelQrSchema,
};