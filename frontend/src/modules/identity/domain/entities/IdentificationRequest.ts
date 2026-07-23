import { UserId, AreaId, PlantId } from '@shared/ids/brandTypes';
import { InvalidStatusTransitionError } from '../errors/IdentityDomainErrors';
import { AggregateRoot } from '@shared/domain/AggregateRoot';
import { IdentificationRequestApproved, IdentificationRequestRejected } from '../events/IdentificationRequestEvents';
import { ClockPort, UuidGeneratorPort } from '@shared/domain/ports/DomainPorts';
import { TokenTypeValue, TokenType } from '../valueObjects/IdentityValueObjects';

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';

/**
 * Aggregate Root: IdentificationRequest
 * Administra el ciclo de vida de una solicitud de impresión de etiquetas.
 */
export class IdentificationRequest extends AggregateRoot<string> {
  private constructor(
    public readonly id: string,
    public readonly plantId: PlantId,
    public readonly areaId: AreaId,
    public readonly tokenType: TokenType,
    public readonly requestedQuantity: number,
    public readonly requestedBy: UserId,
    private _status: RequestStatus,
    public readonly createdAt: Date
  ) {
    super();
  }

  public static create(
    id: string,
    plantId: PlantId,
    areaId: AreaId,
    tokenType: TokenTypeValue,
    requestedQuantity: number,
    requestedBy: UserId,
    clock: ClockPort
  ): IdentificationRequest {
    if (requestedQuantity <= 0) {
      throw new Error("La cantidad solicitada debe ser mayor a cero.");
    }

    return new IdentificationRequest(
      id,
      plantId,
      areaId,
      TokenType.create(tokenType),
      requestedQuantity,
      requestedBy,
      'PENDING',
      clock.now()
    );
  }

  public get status(): RequestStatus {
    return this._status;
  }

  /**
   * Aprueba la solicitud y registra el evento de dominio.
   */
  public approve(approverId: UserId, clock: ClockPort, uuid: UuidGeneratorPort): void {
    if (this._status !== 'PENDING') {
      throw new InvalidStatusTransitionError(this._status, 'APPROVED');
    }
    this._status = 'APPROVED';
    this.addDomainEvent(
      new IdentificationRequestApproved(
        uuid.generate(),
        this.id,
        clock.now(),
        approverId,
        this.requestedQuantity
      )
    );
  }

  /**
   * Rechaza la solicitud indicando una razón.
   */
  public reject(rejectorId: UserId, reason: string, clock: ClockPort, uuid: UuidGeneratorPort): void {
    if (this._status !== 'PENDING') {
      throw new InvalidStatusTransitionError(this._status, 'REJECTED');
    }
    this._status = 'REJECTED';
    this.addDomainEvent(
      new IdentificationRequestRejected(
        uuid.generate(),
        this.id,
        clock.now(),
        rejectorId,
        reason
      )
    );
  }
}
