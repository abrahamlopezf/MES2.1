import { ProductionOrderId } from '../valueObjects/ProductionValueObjects';

// Esta entidad está orientada a planificación y en este Bounded Context (Production Execution)
// actúa principalmente como un Read Model o un Aggregate de solo lectura para el piso de planta.
export class ProductionOrder {
  constructor(
    public readonly id: ProductionOrderId,
    public readonly productId: string,
    public readonly targetQuantity: number,
    public readonly bomId: string,
    public readonly plannedStartDate: Date,
    public readonly plannedEndDate: Date,
    public readonly status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  ) {}
}
