import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import catalogsApi from '../services/catalogsApi';
import { toast } from 'sonner';

export const useWarehousesQuery = (params = { pageSize: 100 }) => {
  return useQuery({
    queryKey: ['warehouses', params],
    queryFn: () => catalogsApi.getWarehouses(params),
  });
};

export const useStorageLocationTypesQuery = (params = { pageSize: 100 }) => {
  return useQuery({
    queryKey: ['storage-location-types', params],
    queryFn: () => catalogsApi.getStorageLocationTypes(params),
  });
};

export const useStorageLocationStatusesQuery = (params = { pageSize: 100 }) => {
  return useQuery({
    queryKey: ['storage-location-statuses', params],
    queryFn: () => catalogsApi.getStorageLocationStatuses(params),
  });
};

export const useStorageLocationsQuery = (params = { pageSize: 100 }) => {
  return useQuery({
    queryKey: ['storage-locations', params],
    queryFn: () => catalogsApi.getStorageLocations(params),
  });
};

export const useStorageLocationMutation = (uuid) => {
  const queryClient = useQueryClient();
  const isEdit = !!uuid;

  return useMutation({
    mutationFn: (payload) => {
      if (isEdit) {
        return catalogsApi.updateStorageLocation({ uuid, payload });
      }
      return catalogsApi.createStorageLocation(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-locations'] });
      toast.success(
        isEdit 
          ? 'Localidad de almacenamiento actualizada con éxito' 
          : 'Localidad de almacenamiento creada con éxito'
      );
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Ocurrió un error al procesar la solicitud');
    }
  });
};
