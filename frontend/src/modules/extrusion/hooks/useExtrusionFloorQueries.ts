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
  massBalance: (mixQr: string) => ['extrusion', 'mass-balance', mixQr] as const,
};

export const useExtruderQueuesQuery = () => {
  return useQuery({
    queryKey: EXTRUSION_QUERY_KEYS.queues,
    queryFn: extrusionApi.getExtruderQueues,
    refetchInterval: 10000, // Refresca cada 10s para mantener el estado operativo del piso actualizado
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: 'always',
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

export const useCreatePtiRackMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { rack_code: string; max_capacity?: number; location_name?: string }) =>
      extrusionApi.createPtiRack(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXTRUSION_QUERY_KEYS.racks });
    },
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

export const useMassBalanceQuery = (mixtureQr?: string) => {
  return useQuery({
    queryKey: EXTRUSION_QUERY_KEYS.massBalance(mixtureQr || ''),
    queryFn: () => extrusionApi.getMassBalance(mixtureQr!),
    enabled: Boolean(mixtureQr && mixtureQr.trim().length > 3),
    refetchInterval: 15000,
  });
};

export const useRegisterScrapMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      extruder_id: number;
      mixture_qr_id?: string;
      scrap_weight_kg: number;
      reason: string;
      notes?: string;
    }) => extrusionApi.registerScrap(payload),
    onSuccess: (_, variables) => {
      if (variables.mixture_qr_id) {
        queryClient.invalidateQueries({
          queryKey: EXTRUSION_QUERY_KEYS.massBalance(variables.mixture_qr_id),
        });
      }
      queryClient.invalidateQueries({ queryKey: EXTRUSION_QUERY_KEYS.queues });
    },
  });
};

export const useUpdatePtiRackPriceMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ rackId, payload }: { rackId: number; payload: { unit_price?: number; unit_weight_kg?: number } }) =>
      extrusionApi.updatePtiRackPrice(rackId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXTRUSION_QUERY_KEYS.racks });
      queryClient.invalidateQueries({ queryKey: ['extrusion', 'valuation'] });
    },
  });
};

export const useExtrusionValuationQuery = (costIndex?: number) => {
  return useQuery({
    queryKey: ['extrusion', 'valuation', costIndex],
    queryFn: () => extrusionApi.getExtrusionValuation(costIndex),
    refetchInterval: 15000,
  });
};

export const useSplitMixtureContainersMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { parent_mixture_qr: string; containers: { container_number?: number; weight_kg?: number }[]; notes?: string }) =>
      extrusionApi.splitMixtureContainers(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXTRUSION_QUERY_KEYS.queues });
    },
  });
};

export const useMixtureTransitionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      extruder_id: number;
      from_mixture_qr?: string;
      to_mixture_qr?: string;
      transition_scrap_kg: number;
      last_pti_quantity?: number;
      first_pti_quantity?: number;
      reason?: string;
      notes?: string;
    }) => extrusionApi.recordMixtureTransition(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXTRUSION_QUERY_KEYS.queues });
      queryClient.invalidateQueries({ queryKey: EXTRUSION_QUERY_KEYS.racks });
    },
  });
};

// ==========================================
// FÓRMULAS & ÍNDICE DE MULTIPLICACIÓN
// ==========================================

export const useUpdateFormulaMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) =>
      extrusionApi.updateFormula(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXTRUSION_QUERY_KEYS.formulas });
      queryClient.invalidateQueries({ queryKey: ['extrusion', 'mixing-formulas'] });
      queryClient.invalidateQueries({ queryKey: ['extrusion', 'pti-products'] });
      queryClient.invalidateQueries({ queryKey: ['extrusion', 'valuation'] });
    },
  });
};

// ==========================================
// CATÁLOGO DE PRODUCTOS TERMINADOS INTERMEDIOS (PTI)
// ==========================================

export const usePtiProductsQuery = (params?: { is_active?: boolean | string; formula_id?: number; search?: string }) => {
  return useQuery({
    queryKey: ['extrusion', 'pti-products', params],
    queryFn: () => extrusionApi.getPtiProducts(params),
  });
};

export const useCreatePtiProductMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: any) => extrusionApi.createPtiProduct(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extrusion', 'pti-products'] });
      queryClient.invalidateQueries({ queryKey: EXTRUSION_QUERY_KEYS.formulas });
      queryClient.invalidateQueries({ queryKey: ['extrusion', 'mixing-formulas'] });
    },
  });
};

export const useUpdatePtiProductMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) =>
      extrusionApi.updatePtiProduct(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extrusion', 'pti-products'] });
      queryClient.invalidateQueries({ queryKey: EXTRUSION_QUERY_KEYS.formulas });
      queryClient.invalidateQueries({ queryKey: ['extrusion', 'mixing-formulas'] });
      queryClient.invalidateQueries({ queryKey: EXTRUSION_QUERY_KEYS.racks });
    },
  });
};

export const useDeletePtiProductMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => extrusionApi.deletePtiProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extrusion', 'pti-products'] });
      queryClient.invalidateQueries({ queryKey: EXTRUSION_QUERY_KEYS.formulas });
      queryClient.invalidateQueries({ queryKey: ['extrusion', 'mixing-formulas'] });
      queryClient.invalidateQueries({ queryKey: EXTRUSION_QUERY_KEYS.racks });
    },
  });
};
