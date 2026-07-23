import { CatalogRepository } from '../../application/ports/CatalogRepository';
import { Material } from '../../domain/entities/Material';
import { MaterialCategory } from '../../domain/entities/MaterialCategory';
import { Station } from '../../domain/entities/Station';
import { Machine } from '../../domain/entities/Machine';
import { ProcessDefinition } from '../../domain/entities/ProcessDefinition';
import { MixFormula } from '../../domain/entities/MixFormula';
import { MachineRecipe } from '../../domain/entities/MachineRecipe';

export class InMemoryCatalogRepository implements CatalogRepository {
  private materials: Map<string, Material> = new Map();
  private categories: Map<string, MaterialCategory> = new Map();
  private stations: Map<string, Station> = new Map();
  private processDefinitions: Map<string, ProcessDefinition> = new Map();

  constructor() {
    this.seedData();
  }

  private seedData() {
    // Categories
    const cat1 = new MaterialCategory('CAT-001', 'Resinas Vírgenes', 'Materia prima directa');
    const cat2 = new MaterialCategory('CAT-002', 'Pigmentos', 'Aditivos de color');
    const cat3 = new MaterialCategory('CAT-PTI', 'Producto Terminado Intermedio', 'Carretes / Rollos semi-procesados');
    this.categories.set(cat1.id, cat1);
    this.categories.set(cat2.id, cat2);
    this.categories.set(cat3.id, cat3);

    // Materials
    const mat1 = new Material('MAT-001', 'PEAD-100', 'Polietileno Alta Densidad', cat1.id, 'KG');
    const mat2 = new Material('MAT-002', 'PEBD-200', 'Polietileno Baja Densidad', cat1.id, 'KG');
    const mat3 = new Material('MAT-003', 'PIG-BLANCO', 'Pigmento Blanco Titanio', cat2.id, 'KG');
    const mat4 = new Material('PTI-001', 'ROLLO-BLANCO-30', 'Rollo Extruido Blanco 30cm', cat3.id, 'PZA');
    
    this.materials.set(mat1.id, mat1);
    this.materials.set(mat2.id, mat2);
    this.materials.set(mat3.id, mat3);
    this.materials.set(mat4.id, mat4);

    // Machines
    const mixer1 = new Machine('M-MIX-01', 'Mezcladora Horizontal', 'MIX-H2000', 'SN-2023-001');
    const mixer2 = new Machine('M-MIX-02', 'Báscula 1', 'BAL-500', 'SN-B-001');
    
    const extruder1 = new Machine('M-EXT-01', 'Extrusora Principal', 'EXT-9000', 'SN-E-992');
    const extruderHopper = new Machine('M-EXT-02', 'Tolva Alimentadora', 'HOP-100', 'SN-H-100');

    // Stations
    const mixStation1 = new Station(
      'ST-MIX-01', 
      'AREA-PROD-01', 
      'Estación Mezclado 1', 
      'ACTIVE', 
      ['MIXING'], 
      [mixer1, mixer2]
    );
    const extStation1 = new Station(
      'ST-EXT-01', 
      'AREA-PROD-01', 
      'Estación Extrusión 1', 
      'ACTIVE', 
      ['EXTRUSION'], 
      [extruder1, extruderHopper]
    );
    this.stations.set(mixStation1.id, mixStation1);
    this.stations.set(extStation1.id, extStation1);

    // Formulas
    const mixFormula1 = new MixFormula('FORM-PE-BLANCO', 'Fórmula PE Blanco', [
      { materialId: mat1.id, expectedQuantity: 100, unit: 'KG' },
      { materialId: mat3.id, expectedQuantity: 5, unit: 'KG' }
    ], 'KG', '1.0.0', new Date('2023-01-01'));
    this.processDefinitions.set(mixFormula1.id, mixFormula1);

    // Recipes
    const extRecipe1 = new MachineRecipe('REC-EXT-PE', 'Receta Extrusión PE Blanco', [
      { key: 'temperature_zone_1', targetValue: 180, unit: 'C', tolerancePlus: 5, toleranceMinus: 5 },
      { key: 'temperature_zone_2', targetValue: 195, unit: 'C', tolerancePlus: 5, toleranceMinus: 5 },
      { key: 'screw_rpm', targetValue: 120, unit: 'RPM', tolerancePlus: 10, toleranceMinus: 10 }
    ], '1.1.0', new Date('2023-06-01'));
    this.processDefinitions.set(extRecipe1.id, extRecipe1);
  }

  async getAllMaterials(): Promise<Material[]> {
    return Array.from(this.materials.values());
  }

  async getAllCategories(): Promise<MaterialCategory[]> {
    return Array.from(this.categories.values());
  }

  async getMaterialById(id: string): Promise<Material | null> {
    return this.materials.get(id) || null;
  }

  async getCategoryById(id: string): Promise<MaterialCategory | null> {
    return this.categories.get(id) || null;
  }

  async getAllStations(): Promise<Station[]> {
    return Array.from(this.stations.values());
  }

  async getStationById(id: string): Promise<Station | null> {
    return this.stations.get(id) || null;
  }

  async getAllProcessDefinitions(): Promise<ProcessDefinition[]> {
    return Array.from(this.processDefinitions.values());
  }

  async getProcessDefinitionById(id: string): Promise<ProcessDefinition | null> {
    return this.processDefinitions.get(id) || null;
  }
}
