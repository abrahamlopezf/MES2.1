import { Material } from '../../domain/entities/Material';
import { MaterialCategory } from '../../domain/entities/MaterialCategory';
import { AreaCatalog } from '../../domain/entities/AreaCatalog';
import { Station } from '../../domain/entities/Station';
import { ProcessDefinition } from '../../domain/entities/ProcessDefinition';

export interface CatalogRepository {
  getAllMaterials(): Promise<Material[]>;
  getAllCategories(): Promise<MaterialCategory[]>;
  getMaterialById(id: string): Promise<Material | null>;
  getCategoryById(id: string): Promise<MaterialCategory | null>;
  getAllStations(): Promise<Station[]>;
  getStationById(id: string): Promise<Station | null>;
  getProcessDefinitionById(id: string): Promise<ProcessDefinition | null>;
  getAllProcessDefinitions(): Promise<ProcessDefinition[]>;
}
