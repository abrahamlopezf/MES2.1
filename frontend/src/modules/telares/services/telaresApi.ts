import axiosClient from '../../../api/axiosClient';
import {
  Loom,
  ProductionBom,
  LoomRun,
  ViajeroRoll,
  ValidateViajeroScanResponse,
} from '../types/telares.types';

export const telaresApi = {
  getLooms: async (): Promise<Loom[]> => {
    const response = await axiosClient.get('/telares/looms');
    return response.data;
  },

  getBoms: async (): Promise<ProductionBom[]> => {
    const response = await axiosClient.get('/telares/boms');
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

  startRun: async (payload: {
    loom_id: number;
    bom_id: number;
    shift: string;
    meters_planned?: number;
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
};
