import { DomainEvent } from '../../../../shared/domain/events/DomainEvent';
import { StockUnitCreatedEvent } from '../../../warehouse/domain/events/WarehouseEvents';
import { Logger } from '../../../../core/logging/Logger';

export class TraceStockUnitCreatedHandler {
  public async handle(event: DomainEvent): Promise<void> {
    if (event instanceof StockUnitCreatedEvent) {
      Logger.info(`[Traceability] Registrando nacimiento de unidad física. Token: ${event.identityTokenId} -> StockUnit: ${event.stockUnitId}`);
      
      // Aquí en un futuro se escribirá en el Traceability Timeline (Genealogy)
      // Ejemplo: GenealogyRepository.addNode(...)
    }
  }
}
