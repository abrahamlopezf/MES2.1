const Joi = require('joi');

const permissionIdsSchema = Joi.array()
  .items(Joi.number().integer().positive())
  .unique()
  .min(1)
  .messages({
    'array.min': 'Debes asignar al menos un permiso al rol.',
    'array.unique': 'No puedes repetir permisos.',
  });

const createRoleSchema = Joi.object({
  name: Joi.string().trim().min(3).max(100).required().messages({
    'string.empty': 'El nombre del rol es obligatorio.',
    'string.min': 'El nombre del rol debe tener al menos 3 caracteres.',
    'any.required': 'El nombre del rol es obligatorio.',
  }),

  code: Joi.string()
    .trim()
    .uppercase()
    .min(3)
    .max(50)
    .pattern(/^[A-Z0-9_]+$/)
    .required()
    .messages({
      'string.empty': 'El código del rol es obligatorio.',
      'string.pattern.base':
        'El código del rol solo puede usar letras mayúsculas, números y guion bajo.',
      'any.required': 'El código del rol es obligatorio.',
    }),

  description: Joi.string().trim().max(500).allow('', null).optional(),

  is_active: Joi.boolean().optional(),

  permission_ids: permissionIdsSchema.required().messages({
    'any.required': 'Debes asignar permisos al rol.',
  }),
});

const updateRoleSchema = Joi.object({
  name: Joi.string().trim().min(3).max(100).optional(),

  description: Joi.string().trim().max(500).allow('', null).optional(),

  is_active: Joi.boolean().optional(),

  permission_ids: permissionIdsSchema.optional(),
}).min(1).messages({
  'object.min': 'Debes enviar al menos un dato para actualizar.',
});

module.exports = {
  createRoleSchema,
  updateRoleSchema,
};