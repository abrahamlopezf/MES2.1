import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsersRequest, createUserRequest, updateUserRequest, deleteUserRequest } from '../api/usersApi';
import { userAdapter } from '../adapters/user.adapter';
import { User } from '../types/user';
import { UserFormValues } from '../schemas/userSchema';
import { queryKeys } from '@/shared/constants/queryKeys';

export const useUsersQuery = (options: any = {}) => {
  return useQuery({
    queryKey: queryKeys.users.all,
    queryFn: async (): Promise<User[]> => {
      const response = await getUsersRequest();
      // Aplicamos el adaptador a cada DTO que viene del backend
      return response.data.map(userAdapter.toDomain);
    },
    ...options,
  });
};

export const useCreateUserMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UserFormValues) => {
      const dtoPayload = {
        ...userAdapter.toDTO(payload),
        password: 'Temporal123!', // Contraseña por defecto obligatoria para el backend
      };
      const response = await createUserRequest(dtoPayload);
      return userAdapter.toDomain(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
};

export const useUpdateUserMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UserFormValues }) => {
      const dtoPayload = userAdapter.toDTO(payload);
      const response = await updateUserRequest(id, dtoPayload);
      return userAdapter.toDomain(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
};
