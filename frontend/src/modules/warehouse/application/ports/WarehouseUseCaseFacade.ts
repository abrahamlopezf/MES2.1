import { RegisterMaterialEntryRequestDTO, RegisterMaterialEntryResponseDTO } from '../dto/WarehouseDTOs';

export interface WarehouseUseCaseFacade {
  registerMaterialEntry(request: RegisterMaterialEntryRequestDTO): Promise<RegisterMaterialEntryResponseDTO>;
}
