import { useMutation } from '@tanstack/react-query';
import { productionFacade } from '../../infrastructure/di/ProductionModuleDI';
import { ExecuteMixingRequestDTO } from '../../application/ports/ProductionUseCaseFacade';

export function useMixing() {
  return useMutation({
    mutationFn: (request: ExecuteMixingRequestDTO) => 
      productionFacade.executeMixing(request),
  });
}
