import { z } from 'zod';
import { IndustrialCode } from '../valueObjects/IndustrialCode';

// Esquema Zod para validar el IndustrialCode en formularios y requests
export const IndustrialCodeSchema = z.string().refine((val) => IndustrialCode.isValid(val), {
  message: "Formato de Código Industrial inválido. Debe ser como MTY-26-EXT-000001",
});

// Esquemas comunes que podrán ser reutilizados
export const UuidSchema = z.string().uuid("Formato UUID inválido");
export const WeightSchema = z.number().positive("El peso debe ser mayor a 0");
export const QuantitySchema = z.number().int().positive("La cantidad debe ser un entero positivo");
