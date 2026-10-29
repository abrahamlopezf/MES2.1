const { z } = require('zod');
const catalogIdentifierSchema = z.union([
  z.string().uuid(),
  z.string().regex(/^\d+$/, 'Debe ser UUID o ID de catálogo válido'),
]);

const createSchema = z.object({
  family_uuid: z.string().uuid('UUID de familia inválido').optional().nullable(),
  new_family_name: z.string().min(1).max(100).optional().nullable(),

  material_code_uuid: z.string().uuid('UUID de código de material inválido').optional().nullable(),
  article_code: z.string().min(1, 'Código de artículo inválido').max(50).optional().nullable(),
  article_name: z.string().max(150).optional().nullable(),

  brand_uuid: z.string().uuid('UUID de marca inválido').optional().nullable(),
  new_brand_name: z.string().min(1).max(100).optional().nullable(),

  type_uuid: z.string().uuid('UUID de tipo inválido').optional().nullable(),
  new_type_name: z.string().min(1).max(100).optional().nullable(),

  ranking_id: z.number().int({ message: 'La clasificación (Ranking) es obligatoria' }).optional().nullable(),
  name: z.string().min(1, 'El nombre es obligatorio').max(150),
  description: z.string().optional().nullable(),
  minimum_stock: z.number().min(0).optional(),
  maximum_stock: z.number().min(0).optional().nullable(),
  reorder_point: z.number().min(0).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'BLOCKED', 'OBSOLETE']).optional(),
  location_uuid: z.string().uuid('UUID de localidad inválido').optional().nullable(),
  base_unit_uuid: z.union([z.string(), z.number()]).optional().nullable(),
  new_unit_name: z.string().min(1).max(100).optional().nullable(),
  tags: z.array(z.union([z.string(), z.number()])).optional()
}).refine(data => Boolean(data.family_uuid || data.new_family_name), {
  message: 'Debe especificar la Familia (selección existente o nuevo nombre)',
  path: ['family_uuid']
}).refine(data => Boolean(data.material_code_uuid || data.article_code), {
  message: 'Debe especificar el Artículo / Consecutivo (código o selección)',
  path: ['article_code']
});

const updateSchema = z.object({
  family_uuid: catalogIdentifierSchema.optional(),
  material_code_uuid: catalogIdentifierSchema.optional(),
  article_code: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(150).optional(),
  description: z.string().optional().nullable(),
  ranking_id: z.number().int().optional(),
  minimum_stock: z.number().min(0).optional(),
  maximum_stock: z.number().min(0).optional().nullable(),
  reorder_point: z.number().min(0).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'BLOCKED', 'OBSOLETE']).optional(),
  is_active: z.boolean().optional(),
  location_uuid: catalogIdentifierSchema.optional().nullable(),
  type_uuid: catalogIdentifierSchema.optional().nullable(),
  brand_uuid: catalogIdentifierSchema.optional().nullable(),
  base_unit_uuid: z.union([z.string(), z.number()]).optional().nullable(),
  tags: z.array(z.union([z.string(), z.number()])).optional()
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
