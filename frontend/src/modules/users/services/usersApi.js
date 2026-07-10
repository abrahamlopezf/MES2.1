import axiosClient from '../../../api/axiosClient';
import { API_ENDPOINTS } from '../../../api/endpoints';

export const getUsersRequest = async () => {
  const response = await axiosClient.get(API_ENDPOINTS.users);
  return response.data;
};

export const createUserRequest = async (payload) => {
  const response = await axiosClient.post(API_ENDPOINTS.users, payload);
  return response.data;
};

export const updateUserRequest = async (userId, payload) => {
  const response = await axiosClient.put(`${API_ENDPOINTS.users}/${userId}`, payload);
  return response.data;
};

export const deleteUserRequest = async (userId) => {
  const response = await axiosClient.delete(`${API_ENDPOINTS.users}/${userId}`);
  return response.data;
};