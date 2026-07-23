import { ProductionRepository } from '../../application/ports/ProductionRepository';
import { ProductionOrder } from '../../domain/entities/ProductionOrder';
import { ProductionRun } from '../../domain/entities/ProductionRun';

export class InMemoryProductionRepository implements ProductionRepository {
  private runs: Map<string, ProductionRun> = new Map();
  private orders: Map<string, ProductionOrder> = new Map();

  constructor() {
    // Seed con una orden mock para pruebas
    const mockOrder = new ProductionOrder(
      'ORD-2026-001',
      'SKU-POLIMERO-X',
      5000, // targetQuantity
      'BOM-123',
      new Date(),
      new Date(Date.now() + 86400000), // +1 día
      'PLANNED'
    );
    this.orders.set(mockOrder.id, mockOrder);
  }

  async findOrderById(orderId: string): Promise<ProductionOrder | null> {
    return this.orders.get(orderId) || null;
  }

  async saveRun(run: ProductionRun): Promise<void> {
    this.runs.set(run.id, run);
  }

  async findRunById(runId: string): Promise<ProductionRun | null> {
    return this.runs.get(runId) || null;
  }
}
