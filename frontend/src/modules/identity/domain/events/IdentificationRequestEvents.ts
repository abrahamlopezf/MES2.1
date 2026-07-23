import { DomainEvent } from '@shared/domain/events/DomainEvent';
import { UserId } from '@shared/ids/brandTypes';

export class IdentificationRequestApproved extends DomainEvent {
  constructor(
    eventId: string,
    aggregateId: string,
    occurredAt: Date,
    public readonly approvedBy: UserId,
    public readonly requestedQuantity: number,
    correlationId?: string,
    causationId?: string
  ) {
    super(eventId, aggregateId, 'IdentificationRequest', 'IdentificationRequestApproved', occurredAt, 1, correlationId, causationId);
  }
}

export class IdentificationRequestRejected extends DomainEvent {
  constructor(
    eventId: string,
    aggregateId: string,
    occurredAt: Date,
    public readonly rejectedBy: UserId,
    public readonly reason: string,
    correlationId?: string,
    causationId?: string
  ) {
    super(eventId, aggregateId, 'IdentificationRequest', 'IdentificationRequestRejected', occurredAt, 1, correlationId, causationId);
  }
}
