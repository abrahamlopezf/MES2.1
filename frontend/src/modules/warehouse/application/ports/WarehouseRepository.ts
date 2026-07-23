import { StockUnit } from '../../domain/entities/StockUnit';

export interface WarehouseRepository {
  saveStockUnit(unit: StockUnit): Promise<void>;
  getStockUnitById(id: string): Promise<StockUnit | null>;
}
