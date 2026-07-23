import { useMutation } from '@tanstack/react-query';
import { productionFacade } from '../../infrastructure/di/ProductionModuleDI';
import { toast } from 'sonner';

export const useExtrusion = () => {
  const startExtrusion = useMutation({
    mutationFn: async (data: { recipeId: string; stationId: string; operatorId: string; mixBatchQR: string }) => {
      return productionFacade.startExtrusion(data.recipeId, data.stationId, data.operatorId, data.mixBatchQR);
    },
    onSuccess: () => {
      toast.success('Extrusión iniciada. Mezcla consumida exitosamente.');
    },
    onError: (e: any) => {
      toast.error(`Error al iniciar extrusión: ${e.message}`);
    }
  });

  const registerRoll = useMutation({
    mutationFn: async (data: { extrusionId: string; rackId: string; rollQR: string; operatorId: string; quantity: number; unit: string }) => {
      return productionFacade.registerRollToRack(data.extrusionId, data.rackId, data.rollQR, data.operatorId, data.quantity, data.unit);
    },
    onSuccess: () => {
      toast.success('Carrete registrado en el Rack exitosamente.');
    },
    onError: (e: any) => {
      toast.error(`Error al registrar carrete: ${e.message}`);
    }
  });

  const registerRack = useMutation({
    mutationFn: async (data: { rackId: string; ptiMaterialId: string; operatorId: string }) => {
      return productionFacade.registerRack(data.rackId, data.ptiMaterialId, data.operatorId);
    },
    onSuccess: () => {
      toast.success('Rack inicializado exitosamente.');
    },
    onError: (e: any) => {
      toast.error(`Error al inicializar Rack: ${e.message}`);
    }
  });

  return { startExtrusion, registerRoll, registerRack };
};
