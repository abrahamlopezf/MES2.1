import { useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../../api/axiosClient';

interface ReceiveMaterialRequest {
  qr_code: string;
  material_id: number;
  quantity: number;
  location: string;
}

export function useWarehouseEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (request: ReceiveMaterialRequest) => {
      const response = await axiosClient.post('/warehouse/receive', request);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse', 'inventory'] });
    },
  });
}
