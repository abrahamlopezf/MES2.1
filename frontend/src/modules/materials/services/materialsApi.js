import axiosClient from '../../../api/axiosClient';

export const getMaterialCategoriesRequest = (params = {}) => {
  return axiosClient.get('/materials/categories', { params });
};

export const getMaterialCategoryByIdRequest = (id) => {
  return axiosClient.get(`/materials/categories/${id}`);
};

export const createMaterialCategoryRequest = (payload) => {
  return axiosClient.post('/materials/categories', payload);
};

export const updateMaterialCategoryRequest = ({ id, payload }) => {
  return axiosClient.put(`/materials/categories/${id}`, payload);
};

export const deactivateMaterialCategoryRequest = (id) => {
  return axiosClient.delete(`/materials/categories/${id}`);
};

export const getMaterialsRequest = (params = {}) => {
  return axiosClient.get('/materials', { params });
};

export const getMaterialByIdRequest = (id) => {
  return axiosClient.get(`/materials/${id}`);
};

export const createMaterialRequest = (payload) => {
  return axiosClient.post('/materials', payload);
};

export const updateMaterialRequest = ({ id, payload }) => {
  return axiosClient.put(`/materials/${id}`, payload);
};

export const deactivateMaterialRequest = (id) => {
  return axiosClient.delete(`/materials/${id}`);
};