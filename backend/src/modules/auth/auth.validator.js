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

module.exports = {
  loginSchema,
};