import * as z from 'zod';
import { UserStatus } from '../types/user';

export const userSchema = z.object({
  nombres: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  apellidos: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  username: z.string().min(3, 'El username debe tener al menos 3 caracteres'),
  numeroNomina: z.string().optional().or(z.literal('')),
  correo: z.string().email('Debe ser un correo electrónico válido'),
  telefono: z.string().optional().or(z.literal('')),
  areaId: z.string().optional().or(z.literal('')),
  rolId: z.string().min(1, 'El rol es requerido'),
  status: z.enum(['PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED']).default('ACTIVE'),
}).superRefine((data, ctx) => {
  // If we wanted strict backend validation we could check role codes here.
  // We'll enforce the UI logic for areaId.
});

export type UserFormValues = z.infer<typeof userSchema>;
