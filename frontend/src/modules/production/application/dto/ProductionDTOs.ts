import { MaterialRequirement } from '../../domain/valueObjects/ProductionValueObjects';

export interface StartProductionRunRequestDTO {
  productionOrderId: string;
  stationId: string;
  operatorId: string;
  reservedInputs: MaterialRequirement[];
}

export interface ProductionRunResponseDTO {
  productionRunId: string;
  status: string;
  startedAt: string;
}
