const Joi = require('joi');

const passwordSchema = Joi.string()
  .min(8)
  .max(100)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/)
  .messages({
    'string.min': 'La contraseña debe tener al menos 8 caracteres.',
    'string.pattern.base':
      'La contraseña debe incluir mayúscula, minúscula, número y carácter especial.',
  });

const createUserSchema = Joi.object({
  first_name: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'El nombre es obligatorio.',
    'any.required': 'El nombre es obligatorio.',
  }),

  last_name: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'El apellido es obligatorio.',
    'any.required': 'El apellido es obligatorio.',
  }),

  email: Joi.string().trim().email().max(150).required().messages({
    'string.email': 'El correo no tiene un formato válido.',
    'string.empty': 'El correo es obligatorio.',
    'any.required': 'El correo es obligatorio.',
  }),

  username: Joi.string().trim().min(3).max(80).required().messages({
    'string.empty': 'El usuario es obligatorio.',
    'string.min': 'El usuario debe tener al menos 3 caracteres.',
    'any.required': 'El usuario es obligatorio.',
  }),

  numero_nomina: Joi.string().trim().max(30).required().messages({
    'string.empty': 'El número de nómina es obligatorio.',
    'any.required': 'El número de nómina es obligatorio.',
  }),

  password: passwordSchema.required().messages({
    'string.empty': 'La contraseña es obligatoria.',
    'any.required': 'La contraseña es obligatoria.',
  }),

  role_id: Joi.number().integer().positive().required().messages({
    'number.base': 'El rol es obligatorio.',
    'any.required': 'El rol es obligatorio.',
  }),

  area_id: Joi.number().integer().positive().allow(null).optional(),

  is_active: Joi.boolean().optional(),
  must_change_password: Joi.boolean().optional(),
});

const updateUserSchema = Joi.object({
  first_name: Joi.string().trim().min(2).max(100).optional(),
  last_name: Joi.string().trim().min(2).max(100).optional(),
  email: Joi.string().trim().email().max(150).optional(),
  username: Joi.string().trim().min(3).max(80).optional(),
  numero_nomina: Joi.string().trim().max(30).optional(),
  password: passwordSchema.optional(),
  role_id: Joi.number().integer().positive().optional(),
  area_id: Joi.number().integer().positive().allow(null).optional(),
  is_active: Joi.boolean().optional(),
  must_change_password: Joi.boolean().optional(),
}).min(1).messages({
  'object.min': 'Debes enviar al menos un dato para actualizar.',
});

module.exports = {
  createUserSchema,
  updateUserSchema,
};