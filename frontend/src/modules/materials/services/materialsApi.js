import axiosClient from '../../../api/axiosClient';

// === CATEGORIES ===
export const getMaterialCategoriesRequest = (params = {}) => axiosClient.get('/material-categories', { params });
export const getMaterialCategoryByIdRequest = (id) => axiosClient.get(`/material-categories/${id}`);
export const createMaterialCategoryRequest = (payload) => axiosClient.post('/material-categories', payload);
export const updateMaterialCategoryRequest = ({ id, payload }) => axiosClient.patch(`/material-categories/${id}`, payload);
export const deactivateMaterialCategoryRequest = (id) => axiosClient.delete(`/material-categories/${id}`);

// === FAMILIES ===
export const getMaterialFamiliesRequest = (params = {}) => axiosClient.get('/material-families', { params });
export const createMaterialFamilyRequest = (payload) => axiosClient.post('/material-families', payload);
export const updateMaterialFamilyRequest = ({ id, payload }) => axiosClient.patch(`/material-families/${id}`, payload);

// === CODES (ARTICULOS) ===
export const getMaterialCodesRequest = (params = {}) => axiosClient.get('/material-codes', { params });
export const createMaterialCodeRequest = (payload) => axiosClient.post('/material-codes', payload);
export const updateMaterialCodeRequest = ({ id, payload }) => axiosClient.patch(`/material-codes/${id}`, payload);

// === TYPES ===
export const getMaterialTypesRequest = (params = {}) => axiosClient.get('/material-types', { params });
export const createMaterialTypeRequest = (payload) => axiosClient.post('/material-types', payload);
export const updateMaterialTypeRequest = ({ id, payload }) => axiosClient.patch(`/material-types/${id}`, payload);

// === BRANDS ===
export const getMaterialBrandsRequest = (params = {}) => axiosClient.get('/material-brands', { params });
export const createMaterialBrandRequest = (payload) => axiosClient.post('/material-brands', payload);
export const updateMaterialBrandRequest = ({ id, payload }) => axiosClient.patch(`/material-brands/${id}`, payload);

// === MATERIALS ===
export const getMaterialsRequest = (params = {}) => axiosClient.get('/materials', { params });
export const getMaterialByIdRequest = (id) => axiosClient.get(`/materials/${id}`);
export const createMaterialRequest = (payload) => axiosClient.post('/materials', payload);
export const updateMaterialRequest = ({ id, payload }) => axiosClient.patch(`/materials/${id}`, payload);
export const deactivateMaterialRequest = (id) => axiosClient.delete(`/materials/${id}`);