import { DomainEvent } from '../../../../shared/domain/events/DomainEvent';
import { UnitOfMeasure } from '../../catalog/domain/valueObjects/UnitOfMeasure';

export class StockUnitCreatedEvent extends DomainEvent {
  constructor(
    eventId: string,
    public readonly stockUnitId: string,
    occurredAt: Date,
    public readonly identityTokenId: string,
    public readonly materialId: string,
    public readonly quantity: number,
    public readonly unit: UnitOfMeasure,
    public readonly location: string,
    public readonly createdBy: string,
    correlationId?: string,
    causationId?: string
  ) {
    super(eventId, stockUnitId, 'StockUnit', 'StockUnitCreatedEvent', occurredAt, 1, correlationId, causationId);
  }
}
