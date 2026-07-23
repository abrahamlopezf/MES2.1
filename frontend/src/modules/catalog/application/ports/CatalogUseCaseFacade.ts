import { MaterialDTO, MaterialCategoryDTO, StationDTO, ProcessDefinitionDTO } from '../dto/CatalogDTOs';

export interface CatalogUseCaseFacade {
  getAllMaterials(): Promise<MaterialDTO[]>;
  getAllCategories(): Promise<MaterialCategoryDTO[]>;
  getAllStations(): Promise<StationDTO[]>;
  getAllProcessDefinitions(): Promise<ProcessDefinitionDTO[]>;
  getProcessDefinitionById(id: string): Promise<ProcessDefinitionDTO | null>;
}
