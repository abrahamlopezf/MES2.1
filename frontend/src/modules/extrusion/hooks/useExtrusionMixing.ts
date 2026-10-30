import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../core/api/apiClient';

interface MixInput {
  qr_code: string;
  quantity: number;
}

interface MixPayload {
  formula_id: string;
  output_color?: string;
  preparation_id?: string;
  destination_qr_code?: string;
  container_count?: number;
  extruder_id?: number;
  inputs: MixInput[];
  notes?: string;
}

export const useFormulas = () => {
  return useQuery({
    queryKey: ['extrusion', 'mixing-formulas'],
    queryFn: async () => {
      try {
        const res: any = await apiClient.get('/extrusion/floor-formulas');
        const list = Array.isArray(res) ? res : (res?.data || []);
        if (list.length > 0) return list;
      } catch {
        // fallback
      }
      const res2: any = await apiClient.get('/extrusion/formulas');
      return Array.isArray(res2) ? res2 : (res2?.data || []);
    },
  });
};

export const useMixFormula = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: MixPayload) => {
      const res = await apiClient.post<{ success: boolean; data: any; message: string }>('/extrusion/mix', payload);
      return res;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['extrusion', 'formulas'] }),
        queryClient.invalidateQueries({ queryKey: ['extrusion', 'mixing-formulas'] }),
        queryClient.invalidateQueries({ queryKey: ['extrusion', 'formula-details'] }),
        queryClient.invalidateQueries({ queryKey: ['extrusion', 'queues'] }),
        queryClient.invalidateQueries({ queryKey: ['extrusion', 'prepared-mix-history'] }),
        queryClient.invalidateQueries({ queryKey: ['extrusion', 'wip-inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['warehouse', 'silos'] }),
        queryClient.invalidateQueries({ queryKey: ['warehouse', 'inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['warehouse', 'dashboard-metrics'] }),
        queryClient.invalidateQueries({ queryKey: ['wip', 'inventory'] }),
      ]);
    },
  });
};

export const useFormulaDetails = (formulaId: string | number | undefined) => {
  return useQuery({
    queryKey: ['extrusion', 'formula-details', formulaId],
    queryFn: async () => {
      if (!formulaId) return null;
      const res: any = await apiClient.get(`/extrusion/formulas/${formulaId}`);
      return res?.data || res;
    },
    // Keep the QR-backed WIP and FIFO suggestions fresh while the mixing
    // terminal is open; the backend still validates/locks stock on submit.
    refetchInterval: 2500,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: 'always',
    enabled: Boolean(formulaId),
  });
};

export const fetchWipChildQr = async (qrCode: string) => {
  const scannedValue = (qrCode || '').trim();
  // Encrypted QR payloads are case-sensitive; normalize only the AGY prefix.
  const cleanQr = /^AGY:/i.test(scannedValue) ? `AGY:${scannedValue.slice(4)}` : scannedValue.toUpperCase();
  if (!cleanQr) throw new Error('Código QR requerido.');
  const res: any = await apiClient.get(`/extrusion/wip-child-qr/${encodeURIComponent(cleanQr)}`);
  return res?.data || res;
};

export const usePreparedMixHistory = (params: number | { limit?: number; formula_id?: string; startDate?: string; endDate?: string; sort?: 'ASC' | 'DESC' } = 100) => {
  const queryObj: Record<string, string> = {};
  if (typeof params === 'number') {
    queryObj.limit = String(params);
  } else if (typeof params === 'object' && params !== null) {
    if (params.limit) queryObj.limit = String(params.limit);
    if (params.formula_id && params.formula_id !== 'ALL') queryObj.formula_id = String(params.formula_id);
    if (params.startDate) queryObj.startDate = params.startDate;
    if (params.endDate) queryObj.endDate = params.endDate;
    if (params.sort) queryObj.sort = params.sort;
  }
  const queryString = new URLSearchParams(queryObj).toString();
  return useQuery({
    queryKey: ['extrusion', 'prepared-mix-history', queryObj],
    queryFn: async () => {
      const res: any = await apiClient.get(`/extrusion/mix-history${queryString ? `?${queryString}` : ''}`);
      return res?.data || res || [];
    },
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: 'always',
  });
};

export const fetchMixContainersByQrOrFolio = async (identifier: string) => {
  const clean = (identifier || '').trim().toUpperCase();
  if (!clean) throw new Error('Código QR o Folio requerido');
  const res: any = await apiClient.get(`/extrusion/mix/containers/${encodeURIComponent(clean)}`);
  return res?.data || res;
};

// Exportación unificada para retrocompatibilidad
export const useExtrusionMixing = () => {
  return {
    useFormulas,
    useFormulaDetails,
    fetchWipChildQr,
    useMixFormula,
    usePreparedMixHistory,
    fetchMixContainersByQrOrFolio
  };
};
