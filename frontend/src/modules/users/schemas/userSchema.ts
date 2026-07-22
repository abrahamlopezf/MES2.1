import * as z from 'zod';
import { UserStatus } from '../types/user';

export const userSchema = z.object({
  nombres: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  apellidos: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  username: z.string().min(3, 'El username debe tener al menos 3 caracteres'),
  numeroNomina: z.string().min(1, 'El número de nómina es requerido'),
  correo: z.string().email('Debe ser un correo electrónico válido'),
  telefono: z.string().min(10, 'El teléfono debe tener al menos 10 dígitos'),
  areaId: z.string().min(1, 'El área es requerida'),
  rolId: z.string().min(1, 'El rol es requerido'),
  status: z.enum(['PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED']).default('ACTIVE'),
});

export type UserFormValues = z.infer<typeof userSchema>;
