const Joi = require('joi');

const startTelaresSchema = Joi.object({
  station_id: Joi.number().integer().positive().required().messages({
    'any.required': 'El ID de la estación (Línea) es obligatorio.',
  }),
  target_material_id: Joi.number().integer().positive().required().messages({
    'any.required': 'El ID del producto (Rollo/Correa) a producir es obligatorio.',
  }),
  length_meters: Joi.number().positive().optional().allow(null),
  notes: Joi.string().allow(null, '').optional(),
});

const registerInputSchema = Joi.object({
  rack_qr_code: Joi.string().required().messages({
    'any.required': 'El código QR del Rack origen es obligatorio.',
  }),
  quantity_spools: Joi.number().positive().required().messages({
    'any.required': 'La cantidad de carretes a consumir es obligatoria.',
    'number.positive': 'La cantidad debe ser mayor a cero.',
  }),
  notes: Joi.string().allow(null, '').optional(),
});

const finishTelaresSchema = Joi.object({
  virgin_qr_code: Joi.string().required().messages({
    'any.required': 'El código QR virgen para el rollo es obligatorio.',
  }),
  quantity_produced: Joi.number().positive().required().messages({
    'any.required': 'La cantidad o longitud final producida es obligatoria.',
  }),
  unit: Joi.string().required().messages({
    'any.required': 'La unidad de medida es obligatoria (ej. MTS, KG, PZS).',
  }),
  notes: Joi.string().allow(null, '').optional(),
});

module.exports = {
  startTelaresSchema,
  registerInputSchema,
  finishTelaresSchema,
};
