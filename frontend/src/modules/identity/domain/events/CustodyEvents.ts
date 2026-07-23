import { DomainEvent } from '@shared/domain/events/DomainEvent';
import { CustodyOwner, TransferReason } from '../valueObjects/CustodyValueObjects';
import { UserId } from '@shared/ids/brandTypes';

export class IdentityCustodyTransferredEvent extends DomainEvent {
  constructor(
    eventId: string,
    aggregateId: string, // identityTokenId
    occurredAt: Date,
    public readonly fromOwner: CustodyOwner,
    public readonly toOwner: CustodyOwner,
    public readonly reason: TransferReason,
    public readonly transferredBy: UserId,
    correlationId?: string,
    causationId?: string
  ) {
    super(eventId, aggregateId, 'IdentityCustodyLedger', 'IdentityCustodyTransferredEvent', occurredAt, 1, correlationId, causationId);
  }
}
