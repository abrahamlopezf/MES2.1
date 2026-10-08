import axiosClient from '../../../api/axiosClient';

// === CATEGORIES ===
export const getMaterialCategoriesRequest = (params = {}) => axiosClient.get('/material-categories', { params });
export const getMaterialCategoryByIdRequest = (id) => axiosClient.get(`/material-categories/${id}`);
export const createMaterialCategoryRequest = (payload) => axiosClient.post('/material-categories', payload);
export const updateMaterialCategoryRequest = ({ id, payload }) => axiosClient.patch(`/material-categories/${id}`, payload);
export const deactivateMaterialCategoryRequest = ({ id, ...payload }) => axiosClient.delete(`/material-categories/${id}`, { data: payload });

// === RANKINGS ===
export const getRankingsRequest = () => axiosClient.get('/materials/rankings');

// === FAMILIES ===
export const getMaterialFamiliesRequest = (params = {}) => axiosClient.get('/material-families', { params });
export const createMaterialFamilyRequest = (payload) => axiosClient.post('/material-families', payload);
export const updateMaterialFamilyRequest = ({ id, payload }) => axiosClient.patch(`/material-families/${id}`, payload);
export const deactivateMaterialFamilyRequest = ({ id, ...payload }) => axiosClient.delete(`/material-families/${id}`, { data: payload });

// === CODES (ARTICULOS) ===
export const getMaterialCodesRequest = (params = {}) => axiosClient.get('/material-codes', { params });
export const createMaterialCodeRequest = (payload) => axiosClient.post('/material-codes', payload);
export const updateMaterialCodeRequest = ({ id, payload }) => axiosClient.patch(`/material-codes/${id}`, payload);
export const deactivateMaterialCodeRequest = ({ id, ...payload }) => axiosClient.delete(`/material-codes/${id}`, { data: payload });

// === TYPES ===
export const getMaterialTypesRequest = (params = {}) => axiosClient.get('/material-types', { params });
export const createMaterialTypeRequest = (payload) => axiosClient.post('/material-types', payload);
export const updateMaterialTypeRequest = ({ id, payload }) => axiosClient.patch(`/material-types/${id}`, payload);
export const deactivateMaterialTypeRequest = ({ id, ...payload }) => axiosClient.delete(`/material-types/${id}`, { data: payload });

// === BRANDS ===
export const getMaterialBrandsRequest = (params = {}) => axiosClient.get('/material-brands', { params });
export const createMaterialBrandRequest = (payload) => axiosClient.post('/material-brands', payload);
export const updateMaterialBrandRequest = ({ id, payload }) => axiosClient.patch(`/material-brands/${id}`, payload);
export const deactivateMaterialBrandRequest = ({ id, ...payload }) => axiosClient.delete(`/material-brands/${id}`, { data: payload });

// === OPERATIONAL AREAS (LOCATIONS) ===
export const getOperationalAreasRequest = (params = {}) => axiosClient.get('/locations', { params });
export const createOperationalAreaRequest = (payload) => axiosClient.post('/locations', payload);
export const updateOperationalAreaRequest = ({ id, payload }) => axiosClient.patch(`/locations/${id}`, payload);
export const deactivateOperationalAreaRequest = ({ id, ...payload }) => axiosClient.delete(`/locations/${id}`, { data: payload });

// === UNITS ===
export const getMaterialUnitsRequest = (params = {}) => axiosClient.get('/material-units', { params });
export const createMaterialUnitRequest = (payload) => axiosClient.post('/material-units', payload);
export const updateMaterialUnitRequest = ({ id, payload }) => axiosClient.patch(`/material-units/${id}`, payload);
export const deactivateMaterialUnitRequest = ({ id, ...payload }) => axiosClient.delete(`/material-units/${id}`, { data: payload });

// === SUPPLIERS ===
export const getSuppliersRequest = (params = {}) => axiosClient.get('/suppliers', { params });
export const createSupplierRequest = (payload) => axiosClient.post('/suppliers', payload);
export const updateSupplierRequest = ({ id, payload }) => axiosClient.patch(`/suppliers/${id}`, payload);
export const deactivateSupplierRequest = ({ id, ...payload }) => axiosClient.delete(`/suppliers/${id}`, { data: payload });

// === MATERIALS ===
export const getMaterialsRequest = (params = {}) => axiosClient.get('/materials', { params });
export const getMaterialByIdRequest = (id) => axiosClient.get(`/materials/${id}`);
export const createMaterialRequest = (payload) => axiosClient.post('/materials', payload);
export const updateMaterialRequest = ({ id, payload }) => axiosClient.patch(`/materials/${id}`, payload);
export const deactivateMaterialRequest = ({ id, ...payload }) => axiosClient.delete(`/materials/${id}`, { data: payload });

// === TAGS ===
export const getTagsRequest = (params = {}) => axiosClient.get('/tags', { params });
export const getActiveTagsRequest = () => axiosClient.get('/tags/active');
export const createTagRequest = (payload) => axiosClient.post('/tags', payload);
export const updateTagRequest = ({ id, payload }) => axiosClient.put(`/tags/${id}`, payload);
export const deactivateTagRequest = ({ id, ...payload }) => axiosClient.delete(`/tags/${id}`, { data: payload });