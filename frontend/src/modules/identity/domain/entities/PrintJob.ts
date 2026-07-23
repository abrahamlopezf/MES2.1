import { AggregateRoot } from '@shared/domain/AggregateRoot';
import { UserId } from '@shared/ids/brandTypes';
import { PrintJobStatus } from '../valueObjects/PrintPipelineValueObjects';
import { PrintJobCreated, PrintRequestedEvent } from '../events/PrintJobEvents';
import { ClockPort, UuidGeneratorPort } from '@shared/domain/ports/DomainPorts';

/**
 * Aggregate Root: PrintJob
 * Gestiona el ciclo de vida transaccional de una impresión.
 */
export class PrintJob extends AggregateRoot<string> {
  private constructor(
    public readonly id: string,
    public readonly batchId: string,
    public readonly templateId: string,
    public readonly idempotencyKey: string,
    public readonly requestedQuantity: number,
    public readonly requestedBy: UserId,
    private _status: PrintJobStatus,
    public readonly createdAt: Date
  ) {
    super();
  }

  public static create(
    id: string,
    batchId: string,
    templateId: string,
    idempotencyKey: string,
    requestedQuantity: number,
    requestedBy: UserId,
    clock: ClockPort,
    uuid: UuidGeneratorPort
  ): PrintJob {
    if (requestedQuantity <= 0) {
      throw new Error("La cantidad a imprimir debe ser mayor a cero.");
    }

    const job = new PrintJob(
      id,
      batchId,
      templateId,
      idempotencyKey,
      requestedQuantity,
      requestedBy,
      'CREATED',
      clock.now()
    );

    job.addDomainEvent(
      new PrintJobCreated(
        uuid.generate(),
        job.id,
        clock.now(),
        requestedBy,
        batchId,
        templateId,
        requestedQuantity
      )
    );

    return job;
  }

  public get status(): PrintJobStatus {
    return this._status;
  }

  public queueForPrinting(clock: ClockPort, uuid: UuidGeneratorPort): void {
    if (this._status !== 'CREATED' && this._status !== 'FAILED') {
      throw new Error(`Invalid status transition to QUEUED from ${this._status}`);
    }
    this._status = 'QUEUED';
    this.addDomainEvent(
      new PrintRequestedEvent(
        uuid.generate(),
        this.id,
        clock.now(),
        this.batchId
      )
    );
  }

  public markPrinting(): void {
    if (this._status !== 'QUEUED') {
      throw new Error(`Invalid status transition to PRINTING from ${this._status}`);
    }
    this._status = 'PRINTING';
  }

  public markCompleted(): void {
    this._status = 'COMPLETED';
    // Podría emitir PrintCompleted Event
  }

  public markFailed(): void {
    this._status = 'FAILED';
    // Podría emitir PrintFailed Event
  }
}
