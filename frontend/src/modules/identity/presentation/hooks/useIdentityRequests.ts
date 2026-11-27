import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../../api/axiosClient';

export type QrIdentityRequestItem = {
  id: number;
  qr_code_id: number;
  delivered_at: string;
  qr_code?: { id: number; qr_code: string; status: string };
};

export type QrIdentityRequest = {
  id: number;
  area_id: number;
  requested_by: number;
  requested_quantity: number;
  notes: string | null;
  requested_at: string;
  delivered_by: number | null;
  delivered_at: string | null;
  delivered_quantity: number;
  status: 'PENDING' | 'DELIVERED';
  area?: { id: number; code: string; name: string };
  items: QrIdentityRequestItem[];
};

export type AvailableQrCode = { id: number; qr_code: string; batch_id: number; status: string; assigned_area_id: number | null; batch_assigned_area_id: number | null };
export type AvailableQrCodePage = { items: AvailableQrCode[]; total: number; limit: number; offset: number };

const identityRequestKeys = {
  all: ['qr-identity-requests'] as const,
  availableCodes: ['qr-identity-requests', 'available-codes'] as const,
};

const getData = <T,>(response: { data?: { data?: T } }): T => response.data?.data as T;

export const useIdentityRequestsQuery = (enabled = true) => useQuery({
  queryKey: identityRequestKeys.all,
  queryFn: async () => (getData<{ items: QrIdentityRequest[] }>(await axiosClient.get('/qrcodes/identity-requests'))).items,
  refetchInterval: 15000,
  enabled,
});

export const useAvailableQrCodesQuery = (enabled: boolean, offset = 0) => useQuery({
  queryKey: [...identityRequestKeys.availableCodes, offset],
  queryFn: async () => getData<AvailableQrCodePage>(await axiosClient.get('/qrcodes/identity-requests/available-codes', { params: { limit: 500, offset } })),
  enabled,
  refetchInterval: enabled ? 15000 : false,
});

export const useCreateIdentityRequestMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { requested_quantity: number; notes?: string }) => getData<QrIdentityRequest>(await axiosClient.post('/qrcodes/identity-requests', payload)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: identityRequestKeys.all }),
  });
};

export const useFulfillIdentityRequestMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, qrCodeIds }: { requestId: number; qrCodeIds: number[] }) => getData<QrIdentityRequest>(await axiosClient.post(`/qrcodes/identity-requests/${requestId}/fulfill`, { qr_code_ids: qrCodeIds })),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: identityRequestKeys.all }),
      queryClient.invalidateQueries({ queryKey: identityRequestKeys.availableCodes }),
      queryClient.invalidateQueries({ queryKey: ['qr-batches'] }),
    ]),
  });
};
