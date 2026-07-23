import { IdentityCustodyRepository } from '../../domain/repositories/IdentityCustodyRepository';
import { IdentityCustodyLedger } from '../../domain/entities/IdentityCustodyLedger';
import { CustodySnapshot } from '../../domain/projections/CustodySnapshot';

export class InMemoryIdentityCustodyRepository implements IdentityCustodyRepository {
  private ledgers: Map<string, IdentityCustodyLedger> = new Map();
  private snapshots: Map<string, CustodySnapshot> = new Map();

  async findLedger(identityTokenId: string): Promise<IdentityCustodyLedger | null> {
    return this.ledgers.get(identityTokenId) || null;
  }

  async saveLedger(ledger: IdentityCustodyLedger): Promise<void> {
    // 1. Guardar el Ledger completo (event sourcing simulación)
    this.ledgers.set(ledger.identityTokenId, ledger);

    // 2. Proyectar el Snapshot automáticamente
    const currentOwner = ledger.currentOwner;
    if (currentOwner) {
      const snapshot: CustodySnapshot = {
        identityTokenId: ledger.identityTokenId,
        currentOwner: currentOwner,
        lastMovementAt: ledger.movements[ledger.movements.length - 1].occurredAt,
        totalMovements: ledger.movements.length
      };
      this.snapshots.set(ledger.identityTokenId, snapshot);
    }
  }

  async findSnapshot(identityTokenId: string): Promise<CustodySnapshot | null> {
    return this.snapshots.get(identityTokenId) || null;
  }
}
