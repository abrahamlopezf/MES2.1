import { useMutation, useQueryClient } from '@tanstack/react-query';
import { GenerateBatchRequestDTO, GenerateBatchResponseDTO } from '../../application/dto/GenerateBatchDTOs';
import { apiClient } from '../../../../core/api/client';

import { batchKeys } from './useIdentityBatches';

export const identityKeys = {
  all: ['identity'] as const,
  batches: () => [...identityKeys.all, 'batches'] as const,
  batch: (id: string) => [...identityKeys.batches(), id] as const,
};

export const useGenerateBatchMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<GenerateBatchResponseDTO, Error, GenerateBatchRequestDTO & { nomenclature_prefix: string }>({
    mutationFn: async (request) => {
      // Mapear al DTO que espera el backend (qrcodes.validator.js)
      const payload = {
        quantity: request.amount,
        nomenclature_prefix: request.nomenclature_prefix,
        // No enviamos assigned_area_id numérico porque ahora el areaId es un string (Ej. 'MPR')
        // El backend lo asignará a null y controlaremos el area por nomenclatura.
      };
      const response = await apiClient.post('/qr/batches', payload);
      return response.data.data;
    },
    onSuccess: () => {
      // Invalida las queries que dependan del listado de lotes
      queryClient.invalidateQueries({ queryKey: batchKeys.list() });
    },
  });
};
