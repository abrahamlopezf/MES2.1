import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../../../api/axiosClient';

export function useMaterials() {
  return useQuery({
    queryKey: ['catalog', 'materials'],
    queryFn: async () => {
      const response = await axiosClient.get('/materials');
      return response.data.data.items;
    }
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['catalog', 'categories'],
    queryFn: async () => {
      const response = await apiClient.get('/materials/categories');
      return response.data.data;
    }
  });
}
