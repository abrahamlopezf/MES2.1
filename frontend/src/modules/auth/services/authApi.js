import axiosClient from '../../../api/axiosClient';
import { API_ENDPOINTS } from '../../../api/endpoints';

export const loginRequest = async (credentials) => {
  const response = await axiosClient.post(API_ENDPOINTS.auth.login, credentials);
  return response.data;
};

export const getMeRequest = async () => {
  const response = await axiosClient.get(API_ENDPOINTS.auth.me);
  return response.data;
};

export const logoutRequest = async () => {
  const response = await axiosClient.post(API_ENDPOINTS.auth.logout);
  return response.data;
};