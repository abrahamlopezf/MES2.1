const { z } = require('zod');

const createSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  description: z.string().max(255).optional().nullable()
});

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(255).optional().nullable(),
  is_active: z.boolean().optional()
});

const searchSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
  pageSize: z.string().regex(/^\d+$/).transform(Number).optional().default('20'),
  search: z.string().optional(),
  status: z.string().optional(),
  include_inactive: z.string().optional()
});

module.exports = {
  createSchema,
  updateSchema,
  searchSchema
};
