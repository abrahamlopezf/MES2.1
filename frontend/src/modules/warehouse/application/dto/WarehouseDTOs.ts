import { UnitOfMeasure } from '../../catalog/domain/valueObjects/UnitOfMeasure';

export interface RegisterMaterialEntryRequestDTO {
  identityTokenId: string;
  materialId: string;
  amount: number;
  unit: UnitOfMeasure;
  locationId: string;
  operatorId: string;
}

export interface RegisterMaterialEntryResponseDTO {
  stockUnitId: string;
  status: string;
  receivedAt: string;
}
