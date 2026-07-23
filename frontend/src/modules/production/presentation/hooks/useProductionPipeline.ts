import { useMutation, useQueryClient } from '@tanstack/react-query';
import { productionFacade } from '../../infrastructure/di/ProductionModuleDI';
import { StartProductionRunRequestDTO } from '../../application/dto/ProductionDTOs';

export const useStartProductionRunMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: StartProductionRunRequestDTO) => productionFacade.startProductionRun(request),
    onSuccess: (_, variables) => {
      // Invalidate relevant queries (e.g. active runs on station, order status)
      queryClient.invalidateQueries({ queryKey: ['activeRuns', variables.stationId] });
      queryClient.invalidateQueries({ queryKey: ['productionOrder', variables.productionOrderId] });
    }
  });
};
