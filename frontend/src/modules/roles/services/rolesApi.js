import axiosClient from '../../../api/axiosClient';
import { API_ENDPOINTS } from '../../../api/endpoints';

export const getRolesRequest = async () => {
  const response = await axiosClient.get(API_ENDPOINTS.roles);
  return response.data;
};

export const createRoleRequest = async (payload) => {
  const response = await axiosClient.post(API_ENDPOINTS.roles, payload);
  return response.data;
};

export const updateRoleRequest = async (roleId, payload) => {
  const response = await axiosClient.put(`${API_ENDPOINTS.roles}/${roleId}`, payload);
  return response.data;
};

export const deleteRoleRequest = async (roleId) => {
  const response = await axiosClient.delete(`${API_ENDPOINTS.roles}/${roleId}`);
  return response.data;
};