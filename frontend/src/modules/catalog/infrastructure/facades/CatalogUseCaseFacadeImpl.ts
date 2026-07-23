import { CatalogUseCaseFacade } from '../../application/ports/CatalogUseCaseFacade';
import { CatalogRepository } from '../../application/ports/CatalogRepository';
import { MaterialDTO, MaterialCategoryDTO, StationDTO, ProcessDefinitionDTO } from '../../application/dto/CatalogDTOs';
import { MixFormula } from '../../domain/entities/MixFormula';

export class CatalogUseCaseFacadeImpl implements CatalogUseCaseFacade {
  constructor(private readonly repository: CatalogRepository) {}

  async getAllMaterials(): Promise<MaterialDTO[]> {
    const materials = await this.repository.getAllMaterials();
    return materials.map(m => ({
      id: m.id,
      code: m.code,
      name: m.name,
      categoryId: m.categoryId,
      defaultUnit: m.defaultUnit
    }));
  }

  async getAllCategories(): Promise<MaterialCategoryDTO[]> {
    const categories = await this.repository.getAllCategories();
    return categories.map(c => ({
      id: c.id,
      code: c.code,
      name: c.name
    }));
  }

  async getAllStations(): Promise<StationDTO[]> {
    const stations = await this.repository.getAllStations();
    return stations.map(s => ({
      id: s.id,
      areaId: s.areaId,
      name: s.name,
      status: s.status,
      capabilities: s.capabilities,
      machines: s.machines.map(m => ({
        id: m.id,
        name: m.name,
        model: m.model,
        serialNumber: m.serialNumber
      }))
    }));
  }

  async getAllProcessDefinitions(): Promise<ProcessDefinitionDTO[]> {
    const processDefs = await this.repository.getAllProcessDefinitions();
    return processDefs.map(pd => this.mapProcessDefinitionToDTO(pd));
  }

  async getProcessDefinitionById(id: string): Promise<ProcessDefinitionDTO | null> {
    const pd = await this.repository.getProcessDefinitionById(id);
    if (!pd) return null;
    return this.mapProcessDefinitionToDTO(pd);
  }

  private mapProcessDefinitionToDTO(pd: any): ProcessDefinitionDTO {
    const dto: ProcessDefinitionDTO = {
      id: pd.id,
      name: pd.name,
      type: pd.type,
      version: pd.version,
      effectiveFrom: pd.effectiveFrom,
      effectiveTo: pd.effectiveTo
    };

    if (pd.type === 'MIX_FORMULA') {
      dto.ingredients = pd.ingredients.map((i: any) => ({
        materialId: i.materialId,
        expectedQuantity: i.expectedQuantity,
        unit: i.unit
      }));
      dto.expectedOutputUnit = pd.expectedOutputUnit;
    } else if (pd.type === 'MACHINE_RECIPE') {
      dto.parameters = pd.parameters.map((p: any) => ({
        key: p.key,
        targetValue: p.targetValue,
        unit: p.unit,
        tolerancePlus: p.tolerancePlus,
        toleranceMinus: p.toleranceMinus
      }));
    }
    
    return dto;
  }
}
