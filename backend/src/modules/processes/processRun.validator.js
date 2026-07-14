const Joi = require('joi');

const startRunSchema = Joi.object({
  mix_qr_code: Joi.string().required().messages({
    'any.required': 'El código QR de la mezcla es obligatorio.',
    'string.empty': 'El código QR de la mezcla no puede estar vacío.',
  }),
  process_area_id: Joi.number().integer().positive().required().messages({
    'any.required': 'El área de proceso es obligatoria.',
  }),
  station_id: Joi.number().integer().positive().optional().allow(null),
  notes: Joi.string().allow(null, '').optional(),
});

const registerOutputSchema = Joi.object({
  rack_qr_code: Joi.string().required().messages({
    'any.required': 'El código QR del Rack destino es obligatorio.',
    'string.empty': 'El código QR del Rack no puede estar vacío.',
  }),
  quantity_spools: Joi.number().positive().required().messages({
    'any.required': 'La cantidad de carretes producidos es obligatoria.',
    'number.positive': 'La cantidad debe ser mayor a cero.',
  }),
  // El backend calculará esto automáticamente según el factor de conversión,
  // pero el frontend puede enviarlo si permite un override manual por el operador.
  override_consumed_kg: Joi.number().positive().optional().allow(null),
  notes: Joi.string().allow(null, '').optional(),
});

module.exports = {
  startRunSchema,
  registerOutputSchema,
};
