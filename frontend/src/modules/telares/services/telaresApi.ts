import axiosClient from '../../../api/axiosClient';
import {
  Loom,
  ProductionBom,
  LoomRun,
  ViajeroRoll,
  ValidateViajeroScanResponse,
  TejidoOperator,
} from '../types/telares.types';

export const telaresApi = {
  getPtiRacks: async (): Promise<any[]> => {
    const response = await axiosClient.get('/telares/pti-racks');
    return response.data.data || [];
  },

  getPtiTransferMode: async (): Promise<{ transfer_mode: 'RACK_PARTIAL' | 'CART_FULL' }> => {
    const response = await axiosClient.get('/telares/pti-transfer-mode');
    return response.data;
  },

  getLooms: async (): Promise<Loom[]> => {
    const response = await axiosClient.get('/telares/looms');
    return response.data;
  },

  getBoms: async (): Promise<ProductionBom[]> => {
    const response = await axiosClient.get('/telares/boms');
    return response.data;
  },

  getOperators: async (includeInactive = true): Promise<TejidoOperator[]> => {
    const response = await axiosClient.get(`/telares/operators${includeInactive ? '?all=true' : ''}`);
    return response.data;
  },

  createOperator: async (payload: Partial<TejidoOperator> & { password?: string }): Promise<TejidoOperator> => {
    const response = await axiosClient.post('/telares/operators', payload);
    return response.data;
  },

  updateOperator: async (id: number, payload: Partial<TejidoOperator> & { password?: string }): Promise<TejidoOperator> => {
    const response = await axiosClient.put(`/telares/operators/${id}`, payload);
    return response.data;
  },

  deleteOperator: async (id: number): Promise<any> => {
    const response = await axiosClient.delete(`/telares/operators/${id}`);
    return response.data;
  },

  assignRack: async (payload: {
    loom_id: number;
    rack_id: number;
    role: 'URDIMBRE' | 'TRAMA' | 'AMBOS';
  }): Promise<any> => {
    const response = await axiosClient.post(`/telares/looms/${payload.loom_id}/assign-rack`, {
      rack_id: payload.rack_id,
      role: payload.role,
    });
    return response.data;
  },

  loadCreel: async (payload: {
    loom_id: number;
    rack_id: number;
    spools_to_load: number;
  }): Promise<any> => {
    const response = await axiosClient.post(`/telares/looms/${payload.loom_id}/load-creel`, {
      rack_id: payload.rack_id,
      spools_to_load: payload.spools_to_load,
    });
    return response.data;
  },

  startRun: async (payload: {
    loom_id: number;
    bom_id: number;
    shift: string;
    meters_planned?: number;
    weight_planned_kg?: number;
    notes?: string;
  }): Promise<LoomRun> => {
    const response = await axiosClient.post('/telares/runs/start', payload);
    return response.data;
  },

  finishRoll: async (payload: {
    run_id: number;
    meters: number;
    weight_kg: number;
    custom_route?: string[];
    notes?: string;
    shift_number?: number;
    operator_nomina?: string;
    shift_supervisor_id: number;
    operator_segments: Array<{
      operator_id: number;
      shift_number: number;
      meters_start: number;
      meters_end: number;
      weight_start_kg?: number;
      weight_end_kg?: number;
    }>;
  }): Promise<{
    success: boolean;
    roll: ViajeroRoll;
    backflush: any[];
    run_summary: any;
  }> => {
    const response = await axiosClient.post('/telares/runs/finish-roll', payload);
    return response.data;
  },

  validateViajeroScan: async (payload: {
    qr_code: string;
    area_name: string;
  }): Promise<ValidateViajeroScanResponse> => {
    const response = await axiosClient.post('/telares/viajero/validate-scan', payload);
    return response.data;
  },

  processViajeroStage: async (payload: {
    qr_code: string;
    target_stage: string;
    meters_in?: number;
    meters_out?: number;
    weight_in_kg?: number;
    weight_out_kg?: number;
    notes?: string;
  }): Promise<{
    success: boolean;
    message: string;
    roll: ViajeroRoll;
  }> => {
    const response = await axiosClient.post('/telares/viajero/process-stage', payload);
    return response.data;
  },

  getViajeroDetails: async (qr_code: string): Promise<ViajeroRoll> => {
    const response = await axiosClient.get(`/telares/viajero/${encodeURIComponent(qr_code)}`);
    return response.data;
  },

  getWipSummary: async (): Promise<import('../types/telares.types').WipSummaryResponse> => {
    const response = await axiosClient.get('/telares/wip-summary');
    return response.data;
  },

  transferCart: async (payload: {
    loom_id: number;
    rack_id?: number;
    cart_qr?: string;
    spools_to_load?: number;
  }): Promise<{
    success: boolean;
    message: string;
    loom: any;
    rack: any;
  }> => {
    const response = await axiosClient.post('/telares/transfer-cart', payload);
    return response.data;
  },

  updatePtiTransferMode: async (transfer_mode: 'RACK_PARTIAL' | 'CART_FULL'): Promise<{ success: boolean; transfer_mode: 'RACK_PARTIAL' | 'CART_FULL' }> => {
    const response = await axiosClient.put('/telares/pti-transfer-mode', { transfer_mode });
    return response.data;
  },
};
