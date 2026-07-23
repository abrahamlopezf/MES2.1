import { useMutation } from '@tanstack/react-query';
import { warehouseFacade } from '../../infrastructure/di/WarehouseModuleDI';
import { RegisterMaterialEntryRequestDTO } from '../../application/dto/WarehouseDTOs';

export function useWarehouseEntry() {
  return useMutation({
    mutationFn: (request: RegisterMaterialEntryRequestDTO) => 
      warehouseFacade.registerMaterialEntry(request),
  });
}
