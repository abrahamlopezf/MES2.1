import axiosClient from '../../../api/axiosClient';
import { GloboSpecification, GloboWipSummary } from '../types/globo.types';

export const globoApi = {
  getSpecifications: async (): Promise<GloboSpecification[]> => {
    const res = await axiosClient.get('/globo/specifications');
    return res.data?.data ?? res.data ?? [];
  },

  getSpecificationById: async (id: number): Promise<GloboSpecification> => {
    const res = await axiosClient.get(`/globo/specifications/${id}`);
    return res.data?.data ?? res.data;
  },

  createSpecification: async (payload: Partial<GloboSpecification>): Promise<GloboSpecification> => {
    const res = await axiosClient.post('/globo/specifications', payload);
    return res.data?.data ?? res.data;
  },

  updateSpecification: async (id: number, payload: Partial<GloboSpecification>): Promise<GloboSpecification> => {
    const res = await axiosClient.put(`/globo/specifications/${id}`, payload);
    return res.data?.data ?? res.data;
  },

  toggleSpecification: async (id: number): Promise<{ id: number; is_active: boolean; message: string }> => {
    const res = await axiosClient.patch(`/globo/specifications/${id}/toggle`);
    return res.data;
  },

  getWipSummary: async (): Promise<GloboWipSummary> => {
    const res = await axiosClient.get('/globo/wip-summary');
    return res.data?.data ?? res.data;
  },

  assessRollMaterials: async (payload: { roll_id: number; specification_id?: number }) => {
    const res = await axiosClient.post('/globo/wip/assess-roll', payload);
    return res.data?.data ?? res.data;
  },

  createOdcForRoll: async (payload: {
    roll_id: number;
    specification_id: number;
    missing_materials: any[];
    notes?: string;
  }) => {
    const res = await axiosClient.post('/globo/wip/create-odc', payload);
    return res.data;
  },

  verifyScan: async (payload: { qr_code: string }) => {
    const res = await axiosClient.post('/globo/wip/verify-scan', payload);
    return res.data;
  },

  transformRoll: async (payload: {
    roll_id: number;
    specification_id: number;
    meters_out?: number;
    weight_out_kg?: number;
    notes?: string;
  }) => {
    const res = await axiosClient.post('/globo/wip/transform-roll', payload);
    return res.data;
  },
};
