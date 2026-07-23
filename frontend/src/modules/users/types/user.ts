export type UserStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface UserRoleDTO {
  id: string | number;
  name: string;
  code: string;
}

export interface UserAreaDTO {
  id: string | number;
  name: string;
  code: string;
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
  role?: UserRoleDTO;
  area?: UserAreaDTO;
}

export interface User {
  id: string;
  nombres: string;
  apellidos: string;
  username: string;
  numeroNomina: string;
  correo: string;
  telefono: string;
  areaId: string;
  areaNombre: string;
  rolId: string;
  rolNombre: string;
  status: UserStatus;
}
