import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { telaresApi } from '../services/telaresApi';

export const TELARES_QUERY_KEYS = {
  looms: ['telares', 'looms'] as const,
  boms: ['telares', 'boms'] as const,
  operators: ['telares', 'operators'] as const,
  ptiTransferMode: ['telares', 'pti-transfer-mode'] as const,
  ptiRacks: ['telares', 'pti-racks'] as const,
  wipSummary: ['telares-wip-summary'] as const,
  viajero: (qrCode: string) => ['telares', 'viajero', qrCode] as const,
};

export const usePtiTransferModeQuery = () => useQuery({
  queryKey: TELARES_QUERY_KEYS.ptiTransferMode,
  queryFn: telaresApi.getPtiTransferMode,
  staleTime: 30000,
});

export const useTelaresPtiRacksQuery = () => useQuery({
  queryKey: TELARES_QUERY_KEYS.ptiRacks,
  queryFn: telaresApi.getPtiRacks,
  refetchInterval: 10000,
});

export const useTelaresWipSummaryQuery = () => useQuery({
  queryKey: TELARES_QUERY_KEYS.wipSummary,
  queryFn: telaresApi.getWipSummary,
  refetchInterval: 10000,
});

export const useLoomsQuery = () => {
  return useQuery({
    queryKey: TELARES_QUERY_KEYS.looms,
    queryFn: telaresApi.getLooms,
    refetchInterval: 8000,
  });
};

export const useBomsQuery = () => {
  return useQuery({
    queryKey: TELARES_QUERY_KEYS.boms,
    queryFn: telaresApi.getBoms,
    staleTime: 60000,
  });
};

export const useTejidoOperatorsQuery = (includeInactive = true) => {
  return useQuery({
    queryKey: [...TELARES_QUERY_KEYS.operators, includeInactive],
    queryFn: () => telaresApi.getOperators(includeInactive),
    staleTime: 60000,
  });
};

export const useCreateOperatorMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: telaresApi.createOperator,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TELARES_QUERY_KEYS.operators });
    },
  });
};

export const useUpdateOperatorMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => telaresApi.updateOperator(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TELARES_QUERY_KEYS.operators });
    },
  });
};

export const useDeleteOperatorMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: telaresApi.deleteOperator,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TELARES_QUERY_KEYS.operators });
    },
  });
};

export const useAssignRackMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: telaresApi.assignRack,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TELARES_QUERY_KEYS.looms });
      queryClient.invalidateQueries({ queryKey: TELARES_QUERY_KEYS.ptiRacks });
      queryClient.invalidateQueries({ queryKey: TELARES_QUERY_KEYS.wipSummary });
      queryClient.invalidateQueries({ queryKey: ['extrusion', 'racks'] });
    },
  });
};

export const useLoadCreelMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: telaresApi.loadCreel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TELARES_QUERY_KEYS.looms });
      queryClient.invalidateQueries({ queryKey: TELARES_QUERY_KEYS.ptiRacks });
      queryClient.invalidateQueries({ queryKey: TELARES_QUERY_KEYS.wipSummary });
      queryClient.invalidateQueries({ queryKey: ['extrusion', 'racks'] });
    },
  });
};

export const useStartRunMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: telaresApi.startRun,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TELARES_QUERY_KEYS.looms });
    },
  });
};

export const useFinishRollMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: telaresApi.finishRoll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TELARES_QUERY_KEYS.looms });
    },
  });
};

export const useValidateViajeroMutation = () => {
  return useMutation({
    mutationFn: telaresApi.validateViajeroScan,
  });
};

export const useProcessViajeroMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: telaresApi.processViajeroStage,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: TELARES_QUERY_KEYS.viajero(variables.qr_code) });
      queryClient.invalidateQueries({ queryKey: TELARES_QUERY_KEYS.looms });
    },
  });
};

export const useViajeroDetailsQuery = (qrCode: string) => {
  return useQuery({
    queryKey: TELARES_QUERY_KEYS.viajero(qrCode),
    queryFn: () => telaresApi.getViajeroDetails(qrCode),
    enabled: Boolean(qrCode && qrCode.trim().length > 2),
  });
};
