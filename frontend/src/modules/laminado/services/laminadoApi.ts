import axiosClient from '../../../api/axiosClient';
import { LaminadoSpecification, LaminadoWipSummary } from '../types/laminado.types';

export const laminadoApi = {
  getSpecifications: async (): Promise<LaminadoSpecification[]> => {
    const res = await axiosClient.get('/laminado/specifications');
    return res.data?.data ?? res.data ?? [];
  },

  getSpecificationById: async (id: number): Promise<LaminadoSpecification> => {
    const res = await axiosClient.get(`/laminado/specifications/${id}`);
    return res.data?.data ?? res.data;
  },

  createSpecification: async (payload: Partial<LaminadoSpecification>): Promise<LaminadoSpecification> => {
    const res = await axiosClient.post('/laminado/specifications', payload);
    return res.data?.data ?? res.data;
  },

  updateSpecification: async (id: number, payload: Partial<LaminadoSpecification>): Promise<LaminadoSpecification> => {
    const res = await axiosClient.put(`/laminado/specifications/${id}`, payload);
    return res.data?.data ?? res.data;
  },

  toggleSpecification: async (id: number): Promise<{ id: number; is_active: boolean; message: string }> => {
    const res = await axiosClient.patch(`/laminado/specifications/${id}/toggle`);
    return res.data;
  },

  getWipSummary: async (): Promise<LaminadoWipSummary> => {
    const res = await axiosClient.get('/laminado/wip-summary');
    return res.data?.data ?? res.data;
  },

  assessRollMaterials: async (payload: { roll_id: number; specification_id?: number }) => {
    const res = await axiosClient.post('/laminado/wip/assess-roll', payload);
    return res.data?.data ?? res.data;
  },

  createOdcForRoll: async (payload: {
    roll_id: number;
    specification_id: number;
    missing_materials: any[];
    notes?: string;
  }) => {
    const res = await axiosClient.post('/laminado/wip/create-odc', payload);
    return res.data;
  },

  verifyScan: async (payload: { qr_code: string }) => {
    const res = await axiosClient.post('/laminado/wip/verify-scan', payload);
    return res.data;
  },

  transformRoll: async (payload: {
    roll_id: number;
    specification_id: number;
    meters_out?: number;
    weight_out_kg?: number;
    notes?: string;
  }) => {
    const res = await axiosClient.post('/laminado/wip/transform-roll', payload);
    return res.data;
  },
};
