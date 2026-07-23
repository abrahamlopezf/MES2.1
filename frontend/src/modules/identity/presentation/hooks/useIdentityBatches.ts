import { useQuery } from '@tanstack/react-query';
import { BatchSnapshotDTO, BatchDetailsDTO } from '../../application/dto/GenerateBatchDTOs';
import { apiClient } from '../../../../core/api/client';

export const batchKeys = {
  all: ['identityBatches'] as const,
  list: () => [...batchKeys.all, 'list'] as const,
  detail: (id: string) => [...batchKeys.all, 'detail', id] as const,
};

export const useIdentityBatchesQuery = () => {
  return useQuery<BatchSnapshotDTO[], Error>({
    queryKey: batchKeys.list(),
    queryFn: async () => {
      const response = await apiClient.get('/qr/batches');
      return response.data.data.items.map((item: any) => {
        const tokens = item.tokens || [];
        const firstCode = tokens.length > 0 ? tokens[0].industrialCode : '';
        const parts = firstCode.split('-');
        // El formato nuevo es AAA-BBB-CCC-0000000001 (Area, SubArea, Category)
        // El formato antiguo (legacy) era QRB-YYYYMMDD-HHMMSS-RANDOM-000001
        let subAreaCode = '';
        if (parts.length >= 4 && parts[0] !== 'QRB') {
          subAreaCode = parts[1]; // BBB
        }
        
        return {
          id: item.id,
          batchNumber: item.batch_code,
          plantId: 'PLANT-01',
          areaId: subAreaCode || (item.assigned_area?.id ? String(item.assigned_area.id) : ''),
          tokenType: 'QR',
          generatedAmount: item.quantity,
          generatedAt: item.created_at,
          tokens: tokens,
        };
      });
    },
  });
};

export const useBatchByIdQuery = (batchId: string | null) => {
  return useQuery<BatchDetailsDTO | null, Error>({
    queryKey: batchKeys.detail(batchId!),
    queryFn: async () => {
      // NOTE: Aquí si quisieramos detalle fetch al backend, por ahora el backend en getQrBatches incluye tokens
      return null;
    },
    enabled: !!batchId,
  });
};
