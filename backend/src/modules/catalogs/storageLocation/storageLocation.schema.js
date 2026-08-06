const { z } = require('zod');

const createSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  description: z.string().max(255).optional().nullable(),
  
  barcode: z.string().max(100).optional().nullable(),
  qr_code: z.string().max(255).optional().nullable(),
  
  warehouse_uuid: z.string().uuid().optional().nullable(),
  zone_uuid: z.string().uuid().optional().nullable(),
  parent_location_uuid: z.string().uuid().optional().nullable(),
  
  location_type_uuid: z.string().uuid(),
  status_uuid: z.string().uuid(),
  
  max_weight: z.number().optional().nullable(),
  max_volume: z.number().optional().nullable(),
  
  height: z.number().optional().nullable(),
  width: z.number().optional().nullable(),
  depth: z.number().optional().nullable()
});

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(255).optional().nullable(),
  
  barcode: z.string().max(100).optional().nullable(),
  qr_code: z.string().max(255).optional().nullable(),
  
  warehouse_uuid: z.string().uuid().optional().nullable(),
  zone_uuid: z.string().uuid().optional().nullable(),
  parent_location_uuid: z.string().uuid().optional().nullable(),
  
  location_type_uuid: z.string().uuid().optional(),
  status_uuid: z.string().uuid().optional(),
  
  max_weight: z.number().optional().nullable(),
  max_volume: z.number().optional().nullable(),
  
  height: z.number().optional().nullable(),
  width: z.number().optional().nullable(),
  depth: z.number().optional().nullable(),
  
  is_active: z.boolean().optional()
});

const searchSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
  pageSize: z.string().regex(/^\d+$/).transform(Number).optional().default('20'),
  search: z.string().optional(),
  status: z.string().optional(),
  warehouse_uuid: z.string().uuid().optional(),
  location_type_uuid: z.string().uuid().optional(),
  include_inactive: z.string().optional()
});

module.exports = {
  createSchema,
  updateSchema,
  searchSchema
};
