export interface ExecuteMixingRequestDTO {
  formulaId: string;
  outputIdentityTokenId: string;
  stationId: string;
  operatorId: string;
  inputs: {
    identityTokenId: string;
    stockUnitId: string;
    materialId: string;
    quantity: number;
    unit: string;
  }[];
  outputQuantity: number;
  outputUnit: string;
}

export interface StationExecutionStateDTO {
  stationId: string;
  status: string;
  currentTransformationId: string | null;
  operatorId: string | null;
  startedAt: Date | null;
}

export interface MachineHealthStateDTO {
  machineId: string;
  stationId: string;
  status: string;
  lastReportedAt: Date;
}

export interface ProductionUseCaseFacade {
  executeMixing(request: ExecuteMixingRequestDTO): Promise<{ transformationId: string }>;
  getAllStationExecutions(): Promise<StationExecutionStateDTO[]>;
  getAllMachineHealths(): Promise<MachineHealthStateDTO[]>;
  changeMachineHealth(machineId: string, status: string): Promise<void>;
  
  startExtrusion(recipeId: string, stationId: string, operatorId: string, mixBatchQR: string): Promise<{ transformationId: string }>;
  registerRollToRack(extrusionId: string, rackId: string, rollQR: string, operatorId: string, quantity: number, unit: string): Promise<void>;
  registerRack(rackId: string, ptiMaterialId: string, operatorId: string): Promise<void>;
}
