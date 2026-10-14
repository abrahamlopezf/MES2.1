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

  scanRackPti: async (payload: ScanRackPtiPayload): Promise<ScanRackPtiResponse> => {
    const response = await axiosClient.post('/extrusion/rack/scan', payload);
    return response.data.data;
  },

  getFloorFormulas: async (): Promise<Formula[]> => {
    const response = await axiosClient.get('/extrusion/floor-formulas');
    return response.data.data;
  }
};
