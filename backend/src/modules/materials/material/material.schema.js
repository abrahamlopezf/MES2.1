const { z } = require('zod');

const createSchema = z.object({
  family_uuid: z.string().uuid('UUID de familia inválido'),
  material_code_uuid: z.string().uuid('UUID de código de material inválido'),

  brand_uuid: z.string().uuid('UUID de marca inválido').optional().nullable(),
  type_uuid: z.string().uuid('UUID de tipo inválido').optional().nullable(),
  name: z.string().min(1, 'El nombre es obligatorio').max(150),
  description: z.string().optional().nullable(),
  minimum_stock: z.number().min(0).optional(),
  maximum_stock: z.number().min(0).optional().nullable(),
  reorder_point: z.number().min(0).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'BLOCKED', 'OBSOLETE']).optional()
});

const updateSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  description: z.string().optional().nullable(),
  minimum_stock: z.number().min(0).optional(),
  maximum_stock: z.number().min(0).optional().nullable(),
  reorder_point: z.number().min(0).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'BLOCKED', 'OBSOLETE']).optional()
  // No permitimos actualizar los UUIDs de clasificación (family, code, etc) aquí
  // para proteger la identidad del Material y su código generado.
});

const searchSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
  pageSize: z.string().regex(/^\d+$/).transform(Number).optional().default('20'),
  search: z.string().optional(),
  status: z.string().optional(),
  family: z.string().uuid().optional(),

  brand: z.string().uuid().optional(),
  type: z.string().uuid().optional()
});

module.exports = {
  createSchema,
  updateSchema,
  searchSchema
};
