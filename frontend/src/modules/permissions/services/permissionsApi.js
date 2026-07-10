import axiosClient from '../../../api/axiosClient';
import { API_ENDPOINTS } from '../../../api/endpoints';

export const getPermissionsRequest = async () => {
  const response = await axiosClient.get(API_ENDPOINTS.permissions);
  return response.data;
};