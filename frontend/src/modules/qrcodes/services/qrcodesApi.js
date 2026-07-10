import axiosClient from '../../../api/axiosClient';
import { API_ENDPOINTS } from '../../../api/endpoints';

export const getQrCodesRequest = async (params = {}) => {
  const response = await axiosClient.get(API_ENDPOINTS.qr.codes, {
    params,
  });

  return response.data;
};

export const generateQrBatchRequest = async (payload) => {
  const response = await axiosClient.post(API_ENDPOINTS.qr.batches, payload);
  return response.data;
};

export const assignQrCodesRequest = async (payload) => {
  const response = await axiosClient.post(API_ENDPOINTS.qr.assign, payload);
  return response.data;
};

export const validateQrRequest = async (payload) => {
  const response = await axiosClient.post(API_ENDPOINTS.qr.validate, payload);
  return response.data;
};

export const getQrEventsRequest = async (qrCodeId) => {
  const response = await axiosClient.get(`${API_ENDPOINTS.qr.codes}/${qrCodeId}/events`);
  return response.data;
};

export const cancelQrRequest = async (qrCodeId, payload) => {
  const response = await axiosClient.post(
    `${API_ENDPOINTS.qr.codes}/${qrCodeId}/cancel`,
    payload
  );

  return response.data;
};

export const scanQrRequest = async (qrCodeValue) => {
  const response = await axiosClient.get(
    `${API_ENDPOINTS.qr.scan}/${encodeURIComponent(qrCodeValue)}`
  );

  return response.data;
};