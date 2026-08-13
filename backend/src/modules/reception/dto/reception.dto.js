const { z } = require('zod');

const ReceiveMaterialSchema = z.object({
  qr_code_value: z.string().min(1, "El código QR es obligatorio"),
  material_id: z.coerce.number().int().positive("El ID del material debe ser positivo"),
  location_id: z.coerce.number().int().positive("El ID de la ubicación debe ser positivo"),
  unit_id: z.coerce.number().int().positive("El ID de la unidad debe ser positivo"),
  quantity: z.coerce.number().positive("La cantidad debe ser mayor a 0"),
  notes: z.string().optional().nullable(),
});

module.exports = {
  ReceiveMaterialSchema
};
