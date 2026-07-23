import { IdentityCustodyLedger } from '../../domain/entities/IdentityCustodyLedger';
import { CustodyTimelineDTO, CustodyMovementDTO } from '../dto/CustodyDTOs';

export class CustodyTimelineMapper {
  public static toDTO(ledger: IdentityCustodyLedger): CustodyTimelineDTO {
    // 1. Clonar el array de movimientos para no mutar el ledger
    // 2. Invertir cronológicamente (el más reciente primero, según la regla de UI)
    const reversedMovements = [...ledger.movements].reverse();

    const movementDTOs: CustodyMovementDTO[] = reversedMovements.map(mov => ({
      id: mov.movementId,
      fromOwner: mov.fromOwner,
      toOwner: mov.toOwner,
      reason: mov.reason,
      performedAt: mov.occurredAt.toISOString(),
      operatorId: mov.transferredBy
    }));

    return {
      identityTokenId: ledger.identityTokenId,
      currentOwner: ledger.currentOwner ?? 'UNKNOWN',
      movements: movementDTOs
    };
  }
}
