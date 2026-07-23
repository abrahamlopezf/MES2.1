import { DomainEvent } from '@shared/domain/events/DomainEvent';
import { UserId } from '@shared/ids/brandTypes';
import { PrintJobStatus } from '../valueObjects/PrintPipelineValueObjects';

export class PrintJobCreated extends DomainEvent {
  constructor(
    eventId: string,
    aggregateId: string, // PrintJobId
    occurredAt: Date,
    public readonly requestedBy: UserId,
    public readonly batchId: string,
    public readonly templateId: string,
    public readonly quantity: number,
    correlationId?: string,
    causationId?: string
  ) {
    super(eventId, aggregateId, 'PrintJob', 'PrintJobCreated', occurredAt, 1, correlationId, causationId);
  }
}

export class PrintRequestedEvent extends DomainEvent {
  constructor(
    eventId: string,
    aggregateId: string, // PrintJobId
    occurredAt: Date,
    public readonly batchId: string,
    correlationId?: string,
    causationId?: string
  ) {
    super(eventId, aggregateId, 'PrintJob', 'PrintRequestedEvent', occurredAt, 1, correlationId, causationId);
  }
}
