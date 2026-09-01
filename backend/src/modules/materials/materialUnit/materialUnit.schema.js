const { z } = require('zod');

const createSchema = z.object({
  code: z.string().min(1, 'El código es obligatorio').max(20, 'El código no puede exceder 20 caracteres'),
  name: z.string().min(1, 'El nombre es obligatorio').max(100, 'El nombre no puede exceder 100 caracteres')
});

const updateSchema = z.object({
  code: z.string().min(1).max(20).optional(),
  name: z.string().min(1).max(100).optional(),
  is_active: z.boolean().optional()
});

module.exports = { createSchema, updateSchema };
