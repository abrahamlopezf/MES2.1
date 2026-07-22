import axiosClient from '@/api/axiosClient';
import { API_ENDPOINTS } from '@/api/endpoints';
import { UserDTO } from '../types/user';

export const getUsersRequest = async (): Promise<{ data: UserDTO[] }> => {
  const response = await axiosClient.get(API_ENDPOINTS.users);
  return response.data;
};

export const createUserRequest = async (payload: Partial<UserDTO>): Promise<{ data: UserDTO }> => {
  const response = await axiosClient.post(API_ENDPOINTS.users, payload);
  return response.data;
};

export const updateUserRequest = async (userId: string, payload: Partial<UserDTO>): Promise<{ data: UserDTO }> => {
  const response = await axiosClient.put(`${API_ENDPOINTS.users}/${userId}`, payload);
  return response.data;
};

export const deleteUserRequest = async (userId: string): Promise<{ data: UserDTO }> => {
  // Nota: Delete request para usuarios según reglas de negocio suele desactivar
  const response = await axiosClient.delete(`${API_ENDPOINTS.users}/${userId}`);
  return response.data;
};
