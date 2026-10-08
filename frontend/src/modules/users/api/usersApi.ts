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

export const deleteUserRequest = async ({ userId, ...payload }: { userId: string, action?: string, reason?: string }): Promise<{ data: UserDTO }> => {
  const response = await axiosClient.delete(`${API_ENDPOINTS.users}/${userId}`, { data: payload });
  return response.data;
};

export const requestDeactivation = async (userId: string): Promise<{ data: null }> => {
  const response = await axiosClient.post(`${API_ENDPOINTS.users}/${userId}/request-deactivation`);
  return response.data;
};
