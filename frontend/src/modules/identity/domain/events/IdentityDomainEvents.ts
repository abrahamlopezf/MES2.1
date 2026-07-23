import { DomainEvent } from '@shared/domain/events/DomainEvent';
import { IdentityTokenId, QrBatchId, UserId } from '@shared/ids/brandTypes';

/**
 * Eventos de Dominio refactorizados como Clases (Event Sourcing / CQRS Ready).
 */

export class IdentityGenerated extends DomainEvent {
  constructor(
    eventId: string,
    aggregateId: string,
    occurredAt: Date,
    public readonly batchId: QrBatchId,
    public readonly tokens: ReadonlyArray<{ tokenId: IdentityTokenId; industrialCode: string }>,
    public readonly generatedBy: UserId,
    correlationId?: string,
    causationId?: string
  ) {
    super(eventId, aggregateId, 'IdentityBatch', 'IdentityGenerated', occurredAt, 1, correlationId, causationId);
  }
}

export class IdentityCancelled extends DomainEvent {
  constructor(
    eventId: string,
    aggregateId: string,
    occurredAt: Date,
    public readonly tokenId: IdentityTokenId,
    public readonly reason: string,
    public readonly cancelledBy: UserId,
    correlationId?: string,
    causationId?: string
  ) {
    super(eventId, aggregateId, 'IdentityToken', 'IdentityCancelled', occurredAt, 1, correlationId, causationId);
  }
}

export class CustodyTransferred extends DomainEvent {
  constructor(
    eventId: string,
    aggregateId: string,
    occurredAt: Date,
    public readonly batchId: QrBatchId,
    public readonly fromOwner: string,
    public readonly toOwner: string,
    correlationId?: string,
    causationId?: string
  ) {
    super(eventId, aggregateId, 'IdentityBatch', 'CustodyTransferred', occurredAt, 1, correlationId, causationId);
  }
}
