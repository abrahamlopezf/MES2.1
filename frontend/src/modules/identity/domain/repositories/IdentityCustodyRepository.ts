import { IdentityCustodyLedger } from '../entities/IdentityCustodyLedger';
import { CustodySnapshot } from '../projections/CustodySnapshot';

export interface IdentityCustodyRepository {
  /**
   * Recupera el Ledger completo (rehidratación de movimientos)
   */
  findLedger(identityTokenId: string): Promise<IdentityCustodyLedger | null>;

  /**
   * Guarda los nuevos movimientos generados por el Ledger.
   */
  saveLedger(ledger: IdentityCustodyLedger): Promise<void>;

  /**
   * Recupera un Snapshot (Read Model) rápido.
   */
  findSnapshot(identityTokenId: string): Promise<CustodySnapshot | null>;
}
