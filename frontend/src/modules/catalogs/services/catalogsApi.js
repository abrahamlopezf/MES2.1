import { api } from '@/lib/api';

const catalogsApi = {
  // Warehouses
  getWarehouses: async (params) => {
    const { data } = await api.get('/catalogs/warehouses', { params });
    return data;
  },

  // Storage Location Types
  getStorageLocationTypes: async (params) => {
    const { data } = await api.get('/catalogs/storage-location-types', { params });
    return data;
  },
  
  // Storage Location Statuses
  getStorageLocationStatuses: async (params) => {
    const { data } = await api.get('/catalogs/storage-location-statuses', { params });
    return data;
  },

  // Storage Locations
  getStorageLocations: async (params) => {
    const { data } = await api.get('/catalogs/storage-locations', { params });
    return data;
  },
  getStorageLocation: async (uuid) => {
    const { data } = await api.get(`/catalogs/storage-locations/${uuid}`);
    return data;
  },
  createStorageLocation: async (payload) => {
    const { data } = await api.post('/catalogs/storage-locations', payload);
    return data;
  },
  updateStorageLocation: async ({ uuid, payload }) => {
    const { data } = await api.patch(`/catalogs/storage-locations/${uuid}`, payload);
    return data;
  },
  deleteStorageLocation: async (uuid) => {
    const { data } = await api.delete(`/catalogs/storage-locations/${uuid}`);
    return data;
  },
  restoreStorageLocation: async (uuid) => {
    const { data } = await api.post(`/catalogs/storage-locations/${uuid}/restore`);
    return data;
  }
};

export default catalogsApi;
