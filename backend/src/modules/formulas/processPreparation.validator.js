const Joi = require('joi');

const createPreparationSchema = Joi.object({
  formula_id: Joi.number().integer().positive().required().messages({
    'any.required': 'El ID de la fórmula es obligatorio.',
  }),
  from_area_id: Joi.number().integer().positive().required().messages({
    'any.required': 'El área de origen (Almacén) es obligatoria.',
  }),
  to_area_id: Joi.number().integer().positive().required().messages({
    'any.required': 'El área de destino (Mezcla/Extrusión) es obligatoria.',
  }),
  destination_qr_code: Joi.string().required().messages({
    'any.required': 'El código QR de destino (virgen) es obligatorio.',
    'string.empty': 'El código QR de destino no puede estar vacío.',
  }),
  target_intermediate_material_id: Joi.number().integer().positive().optional().allow(null),
  inputs: Joi.array()
    .items(
      Joi.object({
        qr_code: Joi.string().required().messages({
          'any.required': 'El código QR de entrada es obligatorio.',
        }),
        quantity: Joi.number().positive().required().messages({
          'any.required': 'La cantidad de entrada es obligatoria.',
          'number.positive': 'La cantidad debe ser mayor a cero.',
        }),
        formula_item_id: Joi.number().integer().positive().optional().allow(null),
      })
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'Debe proveer al menos un material de entrada.',
      'any.required': 'La lista de materiales de entrada es obligatoria.',
    }),
  notes: Joi.string().allow(null, '').optional(),
});

module.exports = {
  createPreparationSchema,
};
