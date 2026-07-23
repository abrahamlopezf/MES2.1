// Basic Value Objects for Production Domain

export type StationId = string;
export type ProductionOrderId = string;
export type OperatorId = string;
export type MaterialId = string;

export enum RunStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface Quantity {
  amount: number;
  unit: string;
}

export interface MaterialRequirement {
  materialId: MaterialId;
  expectedQuantity: Quantity;
}
