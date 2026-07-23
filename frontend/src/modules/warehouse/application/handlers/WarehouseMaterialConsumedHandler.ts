import { DomainEvent } from '../../../../shared/domain/events/DomainEvent';
import { MaterialConsumedEvent } from '../../../production/domain/events/ProductionEvents';
import { WarehouseRepository } from '../ports/WarehouseRepository';
import { Logger } from '../../../../core/logging/Logger';

export class WarehouseMaterialConsumedHandler {
  constructor(private readonly warehouseRepository: WarehouseRepository) {}

  public async handle(event: DomainEvent): Promise<void> {
    if (event instanceof MaterialConsumedEvent) {
      Logger.info(`[Warehouse] Procesando consumo de material: ${event.consumedQuantity} ${event.unit} del StockUnit ${event.stockUnitId}`);
      
      const stockUnit = await this.warehouseRepository.getStockUnitById(event.stockUnitId);
      
      if (!stockUnit) {
        Logger.error(`[Warehouse] StockUnit ${event.stockUnitId} no encontrado para consumo`);
        return;
      }

      stockUnit.consume(event.consumedQuantity);
      await this.warehouseRepository.saveStockUnit(stockUnit);
      
      Logger.info(`[Warehouse] StockUnit ${stockUnit.id} actualizado. Estado actual: ${stockUnit.status}`);
    }
  }
}
