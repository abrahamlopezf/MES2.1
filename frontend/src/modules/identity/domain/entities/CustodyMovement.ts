import { CustodyOwner, TransferReason } from '../valueObjects/CustodyValueObjects';
import { UserId } from '@shared/ids/brandTypes';
import { ClockPort, UuidGeneratorPort } from '@shared/domain/ports/DomainPorts';

/**
 * Entity: CustodyMovement
 * Representa un salto inmutable de custodia de un dueño a otro.
 */
export class CustodyMovement {
  private constructor(
    public readonly movementId: string,
    public readonly identityTokenId: string,
    public readonly fromOwner: CustodyOwner,
    public readonly toOwner: CustodyOwner,
    public readonly reason: TransferReason,
    public readonly transferredBy: UserId,
    public readonly occurredAt: Date
  ) {}

  public static create(
    identityTokenId: string,
    fromOwner: CustodyOwner,
    toOwner: CustodyOwner,
    reason: TransferReason,
    transferredBy: UserId,
    clock: ClockPort,
    uuid: UuidGeneratorPort
  ): CustodyMovement {
    return new CustodyMovement(
      uuid.generate(),
      identityTokenId,
      fromOwner,
      toOwner,
      reason,
      transferredBy,
      clock.now()
    );
  }
}
