const { z } = require('zod');

const createSchema = z.object({
  code: z.string().min(1, 'El código es obligatorio').max(15, 'El código no puede exceder 15 caracteres'),
  name: z.string().min(1, 'El nombre es obligatorio').max(100, 'El nombre no puede exceder 100 caracteres'),
  description: z.string().optional()
});

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional()
});

module.exports = { createSchema, updateSchema };
