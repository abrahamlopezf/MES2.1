import { UnitOfMeasure } from '../../catalog/domain/valueObjects/UnitOfMeasure';

export type LocationId = string;

export interface Quantity {
  amount: number;
  unit: UnitOfMeasure;
}

export enum StockUnitStatus {
  AVAILABLE = 'AVAILABLE',
  QUARANTINE = 'QUARANTINE',
  CONSUMED = 'CONSUMED',
  BLOCKED = 'BLOCKED'
}
