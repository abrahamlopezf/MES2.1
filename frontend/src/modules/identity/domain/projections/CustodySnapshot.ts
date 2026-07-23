import { CustodyOwner } from '../valueObjects/CustodyValueObjects';

/**
 * Projection (Read Model): CustodySnapshot
 * Representa la vista aplanada del Ledger para facilitar consultas rápidas 
 * sin necesidad de rehidratar los miles de eventos/movimientos cada vez.
 */
export interface CustodySnapshot {
  identityTokenId: string;
  currentOwner: CustodyOwner;
  lastMovementAt: Date;
  totalMovements: number;
}
