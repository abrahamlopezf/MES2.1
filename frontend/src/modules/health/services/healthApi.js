import axiosClient from '../../../api/axiosClient';
import { API_ENDPOINTS } from '../../../api/endpoints';

export const getHealthStatus = async () => {
  const response = await axiosClient.get(API_ENDPOINTS.health);
  return response.data;
};