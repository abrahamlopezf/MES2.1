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

  // Mapeo simple de códigos de frontend a códigos de base de datos
  const areaCodeMap: Record<string, string> = {
    'ALM': 'ALMACEN',
    'EXT': 'EXTRUSION',
    'TEL': 'TELARES',
    'LAM': 'LAMINADO',
    'GLB': 'GLOBO',
    'COR': 'CORTE',
    'CON': 'CONFECCION',
    'IMP': 'IMPRENTA',
    'PEG': 'PEGADO',
    'ENS': 'ENSAMBLADO',
    'ETI': 'ETIQUETADO',
    'DOB': 'DOBLADO',
    'PRE': 'PRENSADO',
    'EMB': 'EMBARQUE',
  };

  return useMutation<GenerateBatchResponseDTO, Error, GenerateBatchRequestDTO & { nomenclature_prefix: string, mainAreaId?: string }>({
    mutationFn: async (request) => {
      const dbAreaCode = request.mainAreaId ? areaCodeMap[request.mainAreaId] : undefined;

      const payload = {
        quantity: request.amount,
        nomenclature_prefix: request.nomenclature_prefix,
        area_code: dbAreaCode || request.areaId, // Intentamos enviar el mapeado, sino el original
        // No enviamos assigned_area_id numérico, enviamos el area_code para que el backend lo busque
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
