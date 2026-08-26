export type UserStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface UserAreaDTO {
  id: string | number;
  name: string;
  code: string;
}

export interface UserRoleDTO {
  id: string | number;
  name: string;
  code: string;
  area?: UserAreaDTO | null;
  subarea?: any | null;
}

export interface UserDTO {
  id: string | number;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  numero_nomina: string;
  telefono?: string;
  is_active: boolean;
  must_change_password?: boolean;
  role?: UserRoleDTO;
}

export interface User {
  id: string;
  nombres: string;
  apellidos: string;
  username: string;
  numeroNomina: string;
  correo: string;
  telefono: string;
  areaNombre: string;
  subareaNombre?: string;
  rolId: string;
  rolNombre: string;
  status: UserStatus;
  mustChangePassword?: boolean;
}
