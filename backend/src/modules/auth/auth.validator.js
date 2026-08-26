const Joi = require('joi');

const loginSchema = Joi.object({
  identifier: Joi.string()
    .trim()
    .min(3)
    .max(150)
    .required()
    .messages({
      'string.empty': 'El usuario o correo es obligatorio.',
      'string.min': 'El usuario o correo debe tener al menos 3 caracteres.',
      'any.required': 'El usuario o correo es obligatorio.',
    }),

  password: Joi.string()
    .min(8)
    .max(100)
    .required()
    .messages({
      'string.empty': 'La contraseña es obligatoria.',
      'string.min': 'La contraseña debe tener al menos 8 caracteres.',
      'any.required': 'La contraseña es obligatoria.',
    }),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().min(8).max(100).optional(),
  newPassword: Joi.string()
    .min(8)
    .max(100)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/)
    .required()
    .messages({
      'string.min': 'La contraseña debe tener al menos 8 caracteres.',
      'string.pattern.base': 'La contraseña debe incluir mayúscula, minúscula, número y carácter especial.',
      'string.empty': 'La nueva contraseña es obligatoria.',
      'any.required': 'La nueva contraseña es obligatoria.',
    }),
});

const requestPasswordResetSchema = Joi.object({
  identifier: Joi.string().trim().required(),
});

const resetPasswordSchema = Joi.object({
  identifier: Joi.string().trim().required(),
  code: Joi.string().length(6).required(),
  newPassword: Joi.string()
    .min(8)
    .max(100)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/)
    .required(),
});

const updateProfileSchema = Joi.object({
  email: Joi.string().trim().email({ tlds: { allow: false } }).max(150).optional(),
  telefono: Joi.string().trim().max(20).allow('', null).optional(),
}).min(1).messages({
  'object.min': 'Debes enviar al menos un dato para actualizar.',
});

module.exports = {
  loginSchema,
  changePasswordSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  updateProfileSchema,
};