import { User, UserDTO, UserStatus } from '../types/user';
import { UserFormValues } from '../schemas/userSchema';

export const userAdapter = {
  toDomain: (dto: UserDTO): User => {
    // Mapeo temporal para no romper el backend que aún usa is_active booleano
    let mappedStatus: UserStatus = dto.is_active ? 'ACTIVE' : 'PENDING';

    return {
      id: String(dto.id),
      nombres: dto.first_name || '',
      apellidos: dto.last_name || '',
      username: dto.username || '',
      numeroNomina: dto.numero_nomina || '', 
      correo: dto.email || '',
      telefono: dto.telefono || '',
      areaNombre: dto.role?.area?.name || 'Global',
      subareaNombre: dto.role?.subarea?.name || 'N/A',
      rolId: dto.role ? String(dto.role.id) : '',
      rolNombre: dto.role?.name || 'Sin rol',
      status: mappedStatus,
      mustChangePassword: dto.must_change_password ?? true,
    };
  },

  toDTO: (domain: UserFormValues): Partial<UserDTO> => {
    const dto: Partial<UserDTO> = {
      first_name: domain.nombres,
      last_name: domain.apellidos,
      username: domain.username,
      numero_nomina: domain.numeroNomina,
      email: domain.correo,
      // Temporalmente ACTIVE significa true, cualquier otro significa false
      is_active: domain.status === 'ACTIVE',
      telefono: domain.telefono,
      role_id: Number(domain.rolId),
    };

    if (domain.password) {
      dto.password = domain.password;
    }
    
    if (domain.mustChangePassword !== undefined) {
      dto.must_change_password = domain.mustChangePassword;
    }

    return dto;
  },
};
