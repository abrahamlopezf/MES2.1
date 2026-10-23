import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { telaresApi } from '../services/telaresApi';

export const TELARES_QUERY_KEYS = {
  looms: ['telares', 'looms'] as const,
  boms: ['telares', 'boms'] as const,
  viajero: (qrCode: string) => ['telares', 'viajero', qrCode] as const,
};

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

export const useAssignRackMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: telaresApi.assignRack,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TELARES_QUERY_KEYS.looms });
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
    enabled: Boolean(qrCode && qrCode.trim().length > 3),
  });
};
