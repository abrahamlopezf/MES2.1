import axiosClient from '../../../api/axiosClient';
import {
  MachineQueueGroup,
  PtiRack,
  Formula,
  SwitchQueuePriorityPayload,
  EnqueueMixPayload,
  ScanRackPtiPayload,
  ScanRackPtiResponse,
  ExtruderQueue
} from '../types/extrusion.types';

export const extrusionApi = {
  getExtruderQueues: async (): Promise<MachineQueueGroup[]> => {
    const response = await axiosClient.get('/extrusion/queue');
    return response.data.data;
  },

  switchQueuePriority: async (payload: SwitchQueuePriorityPayload): Promise<any> => {
    const response = await axiosClient.post('/extrusion/queue/switch', payload);
    return response.data;
  },

  enqueueMix: async (payload: EnqueueMixPayload): Promise<ExtruderQueue> => {
    const response = await axiosClient.post('/extrusion/queue/enqueue', payload);
    return response.data.data;
  },

  getPtiRacks: async (): Promise<PtiRack[]> => {
    const response = await axiosClient.get('/extrusion/racks');
    return response.data.data;
  },

  createPtiRack: async (payload: { rack_code: string; max_capacity?: number; location_name?: string }): Promise<PtiRack> => {
    const response = await axiosClient.post('/extrusion/racks', payload);
    return response.data.data;
  },

  scanRackPti: async (payload: ScanRackPtiPayload): Promise<ScanRackPtiResponse> => {
    const response = await axiosClient.post('/extrusion/rack/scan', payload);
    return response.data.data;
  },

  getFloorFormulas: async (): Promise<Formula[]> => {
    const response = await axiosClient.get('/extrusion/floor-formulas');
    return response.data.data;
  },

  getMassBalance: async (mixtureQr: string): Promise<any> => {
    const response = await axiosClient.get(`/extrusion/mass-balance/${encodeURIComponent(mixtureQr)}`);
    return response.data.data;
  },

  getExtrusionWip: async (): Promise<any> => {
    const response = await axiosClient.get('/extrusion/wip/inventory');
    return response.data.data;
  },

  getScrapLogs: async (params?: Record<string, string | number | boolean>): Promise<any[]> => {
    const response = await axiosClient.get('/extrusion/scrap-logs', { params });
    return response.data.data;
  },

  closeShift: async (payload: {
    extruder_id: number;
    shift_date: string;
    shift_code: string;
    actual_scrap_weight_kg?: number;
    grouped_weighings?: Array<{ category: string; color?: string | null; source_lote_id?: number | null; actual_weight_kg: number }>;
    notes?: string;
  }): Promise<any> => {
    const response = await axiosClient.post('/extrusion/shifts/close', payload);
    return response.data.data;
  },

  adjustProductionEntry: async (id: number, payload: { pieces: number; net_weight_kg: number; correction_reason: string }): Promise<any> => {
    const response = await axiosClient.patch(`/extrusion/production/${id}`, payload);
    return response.data.data;
  },

  registerScrap: async (payload: {
    extruder_id: number;
    mixture_qr_id?: string;
    scrap_weight_kg: number;
    actual_weight_kg?: number;
    estimated_weight_kg?: number;
    reason: string;
    category?: string;
    shift_code?: string;
    notes?: string;
  }): Promise<any> => {
    const response = await axiosClient.post('/extrusion/scrap', payload);
    return response.data.data;
  },

  updatePtiRackPrice: async (rackId: number, payload: { unit_price?: number; unit_weight_kg?: number | null }): Promise<PtiRack> => {
    const response = await axiosClient.put(`/extrusion/racks/${rackId}/price`, payload);
    return response.data.data;
  },

  getExtrusionValuation: async (costIndex?: number): Promise<any> => {
    const response = await axiosClient.get('/extrusion/valuation', {
      params: costIndex !== undefined ? { cost_index: costIndex } : {}
    });
    return response.data.data;
  },

  splitMixtureContainers: async (payload: {
    parent_mixture_qr: string;
    containers: { container_number?: number; weight_kg?: number }[];
    notes?: string;
  }): Promise<any> => {
    const response = await axiosClient.post('/extrusion/mix/split-containers', payload);
    return response.data.data;
  },

  recordMixtureTransition: async (payload: {
    extruder_id: number;
    from_mixture_qr?: string;
    to_mixture_qr?: string;
    transition_scrap_kg: number;
    last_pti_quantity?: number;
    first_pti_quantity?: number;
    reason?: string;
    notes?: string;
  }): Promise<any> => {
    const response = await axiosClient.post('/extrusion/mixture-transition', payload);
    return response.data.data;
  },

  // Fórmulas & Índice de Multiplicación
  updateFormula: async (id: number, payload: {
    name?: string;
    description?: string;
    cost_index?: number;
    batch_size_kg?: number;
    expected_yield_pieces?: number;
    expected_yield_kg?: number;
    is_active?: boolean;
    output_pti_id?: number | null;
  }): Promise<Formula> => {
    const response = await axiosClient.put(`/extrusion/floor-formulas/${id}`, payload);
    return response.data.data;
  },

  // Catálogo de PTI (Carretes / Bobinas Salientes)
  getPtiProducts: async (params?: { is_active?: boolean | string; formula_id?: number; search?: string }): Promise<any[]> => {
    const response = await axiosClient.get('/extrusion/pti-products', { params });
    return response.data.data;
  },

  getPtiProductById: async (id: number): Promise<any> => {
    const response = await axiosClient.get(`/extrusion/pti-products/${id}`);
    return response.data.data;
  },

  createPtiProduct: async (payload: any): Promise<any> => {
    const response = await axiosClient.post('/extrusion/pti-products', payload);
    return response.data.data;
  },

  updatePtiProduct: async (id: number, payload: any): Promise<any> => {
    const response = await axiosClient.put(`/extrusion/pti-products/${id}`, payload);
    return response.data.data;
  },

  deletePtiProduct: async (id: number): Promise<any> => {
    const response = await axiosClient.delete(`/extrusion/pti-products/${id}`);
    return response.data;
  }
};
