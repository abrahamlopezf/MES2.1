import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getAreasRequest } from '../../areas/services/areasApi';

import {
  assignQrCodesRequest,
  cancelQrRequest,
  generateQrBatchRequest,
  getQrCodesRequest,
  getQrEventsRequest,
  validateQrRequest,
} from '../services/qrcodesApi';

export const qrQueryKeys = {
  all: ['qr'],
  lists: () => [...qrQueryKeys.all, 'list'],
  list: (filters) => [...qrQueryKeys.lists(), filters],
  events: (qrId) => [...qrQueryKeys.all, 'events', qrId],
};

export const areasQueryKeys = {
  all: ['areas'],
  lists: () => [...areasQueryKeys.all, 'list'],
};

const buildQrParams = (filters = {}) => {
  const params = {
    limit: 200,
  };

  if (filters.search) params.search = filters.search;
  if (filters.status) params.status = filters.status;
  if (filters.area_id) params.area_id = filters.area_id;

  return params;
};

export const useQrCodesQuery = (filters) => {
  return useQuery({
    queryKey: qrQueryKeys.list(filters),
    queryFn: async () => {
      const response = await getQrCodesRequest(buildQrParams(filters));

      return {
        items: response.data?.items || [],
        total: response.data?.total || 0,
      };
    },
  });
};

export const useAreasQuery = () => {
  return useQuery({
    queryKey: areasQueryKeys.lists(),
    queryFn: async () => {
      const response = await getAreasRequest();
      return response.data || [];
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useQrEventsQuery = (qrId) => {
  return useQuery({
    queryKey: qrQueryKeys.events(qrId),
    queryFn: async () => {
      const response = await getQrEventsRequest(qrId);
      return response.data || [];
    },
    enabled: Boolean(qrId),
  });
};

export const useGenerateQrBatchMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateQrBatchRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qrQueryKeys.lists() });
    },
  });
};

export const useAssignQrCodesMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: assignQrCodesRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qrQueryKeys.lists() });
    },
  });
};

export const useValidateQrMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: validateQrRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qrQueryKeys.lists() });
    },
  });
};

export const useCancelQrMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ qrId, payload }) => cancelQrRequest(qrId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qrQueryKeys.lists() });
    },
  });
};