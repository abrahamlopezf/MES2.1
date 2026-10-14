import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { extrusionApi } from '../services/extrusionApi';
import {
  SwitchQueuePriorityPayload,
  EnqueueMixPayload,
  ScanRackPtiPayload
} from '../types/extrusion.types';

export const EXTRUSION_QUERY_KEYS = {
  queues: ['extrusion', 'queues'] as const,
  racks: ['extrusion', 'racks'] as const,
  formulas: ['extrusion', 'floor-formulas'] as const,
};

export const useExtruderQueuesQuery = () => {
  return useQuery({
    queryKey: EXTRUSION_QUERY_KEYS.queues,
    queryFn: extrusionApi.getExtruderQueues,
    refetchInterval: 10000, // Refresca cada 10s para mantener el estado operativo del piso actualizado
  });
};

export const usePtiRacksQuery = () => {
  return useQuery({
    queryKey: EXTRUSION_QUERY_KEYS.racks,
    queryFn: extrusionApi.getPtiRacks,
    refetchInterval: 10000,
  });
};

export const useFloorFormulasQuery = () => {
  return useQuery({
    queryKey: EXTRUSION_QUERY_KEYS.formulas,
    queryFn: extrusionApi.getFloorFormulas,
  });
};

export const useSwitchQueueMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SwitchQueuePriorityPayload) =>
      extrusionApi.switchQueuePriority(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXTRUSION_QUERY_KEYS.queues });
    },
  });
};

export const useEnqueueMixMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: EnqueueMixPayload) =>
      extrusionApi.enqueueMix(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXTRUSION_QUERY_KEYS.queues });
    },
  });
};

export const useScanRackPtiMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ScanRackPtiPayload) =>
      extrusionApi.scanRackPti(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXTRUSION_QUERY_KEYS.racks });
      queryClient.invalidateQueries({ queryKey: EXTRUSION_QUERY_KEYS.queues });
    },
  });
};
