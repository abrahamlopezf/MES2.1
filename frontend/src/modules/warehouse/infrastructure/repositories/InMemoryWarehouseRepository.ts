import { WarehouseRepository } from '../../application/ports/WarehouseRepository';
import { StockUnit } from '../../domain/entities/StockUnit';

export class InMemoryWarehouseRepository implements WarehouseRepository {
  private stockUnits: Map<string, StockUnit> = new Map();

  async saveStockUnit(unit: StockUnit): Promise<void> {
    this.stockUnits.set(unit.id, unit);
  }

  async getStockUnitById(id: string): Promise<StockUnit | null> {
    return this.stockUnits.get(id) || null;
  }
}
