import { useQuery } from '@tanstack/react-query';
import { BatchSnapshotDTO, BatchDetailsDTO } from '../../application/dto/GenerateBatchDTOs';
import axiosClient from '../../../../api/axiosClient';

export const batchKeys = {
  all: ['identityBatches'] as const,
  list: () => [...batchKeys.all, 'list'] as const,
  detail: (id: string) => [...batchKeys.all, 'detail', id] as const,
};

export const useIdentityBatchesQuery = () => {
  return useQuery<BatchSnapshotDTO[], Error>({
    queryKey: batchKeys.list(),
    queryFn: async () => {
      const response = await axiosClient.get('/qr/batches');
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
      const response = await axiosClient.get(`/qr/batches/${batchId}`);
      const item = response.data.data;
      const tokens = item.tokens || [];
      const firstCode = tokens.length > 0 ? tokens[0].industrialCode : '';
      const parts = firstCode.split('-');
      let subAreaCode = '';
      if (parts.length >= 4 && parts[0] !== 'QRB') {
        subAreaCode = parts[1];
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
    },
    enabled: !!batchId,
  });
};

export const downloadBatchPdf = async (batchId: string, batchNumber: string) => {
  const response = await axiosClient.post(`/qr/batches/${batchId}/print`, {}, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `batch-${batchNumber}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
};

export const downloadQrPdf = async (uuid: string, qrCode: string) => {
  const response = await axiosClient.post(`/qr/${uuid}/print`, {}, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `qr-${uuid}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
};
