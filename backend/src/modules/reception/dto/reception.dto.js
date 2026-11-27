const { z } = require('zod');

const ReceiveMaterialSchema = z.object({
  qr_code_value: z.string().min(1, "El código QR es obligatorio"),
  material_id: z.coerce.number().int().positive("El ID del material debe ser positivo"),
  location_id: z.coerce.number().int().positive("El ID de la ubicación debe ser positivo"),
  unit_id: z.coerce.number().int().positive("El ID de la unidad debe ser positivo"),
  quantity: z.coerce.number().positive("La cantidad debe ser mayor a 0"),
  presentation_quantity: z.coerce.number().positive("La presentación debe ser mayor a 0"),
  presentation_unit: z.string().trim().min(1, "La unidad de presentación es obligatoria"),
  folio: z.string().min(1, "El folio es obligatorio"),
  supplier_id: z.union([z.coerce.number(), z.string()]).optional().nullable(),
  new_supplier_name: z.string().min(1).max(150).optional().nullable(),
  notes: z.string().optional().nullable(),
  unit_cost: z.coerce.number().nonnegative("El costo unitario no puede ser negativo"),
  total_cost: z.coerce.number().nonnegative("El costo total no puede ser negativo"),
}).refine(
  ({ quantity, presentation_quantity }) => Math.abs(quantity / presentation_quantity - Math.round(quantity / presentation_quantity)) <= 0.0005,
  { message: 'La cantidad recibida debe corresponder a empaques completos.', path: ['presentation_quantity'] }
);

module.exports = {
  ReceiveMaterialSchema
};
