export interface MaterialDTO {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  defaultUnit: string;
}

export interface MaterialCategoryDTO {
  id: string;
  code: string;
  name: string;
}

export interface MachineDTO {
  id: string;
  name: string;
  model: string;
  serialNumber: string;
}

export interface StationDTO {
  id: string;
  areaId: string;
  name: string;
  status: string;
  capabilities: string[];
  machines: MachineDTO[];
}

export interface ProcessDefinitionDTO {
  id: string;
  name: string;
  type: string;
  version: string;
  effectiveFrom: Date;
  effectiveTo?: Date;
  // Añadimos datos de fórmula si es MIX_FORMULA
  ingredients?: { materialId: string; expectedQuantity: number; unit: string }[];
  expectedOutputUnit?: string;
  // Añadimos datos si es MACHINE_RECIPE
  parameters?: { key: string; targetValue: number; unit: string; tolerancePlus?: number; toleranceMinus?: number; }[];
}
