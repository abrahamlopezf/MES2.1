import axiosClient from '../../../api/axiosClient';
import { API_ENDPOINTS } from '../../../api/endpoints';

export const getAreasRequest = async () => {
  const response = await axiosClient.get(API_ENDPOINTS.areas);
  return response.data;
};