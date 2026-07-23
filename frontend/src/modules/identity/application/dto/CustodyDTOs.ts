import { TransferReason } from '../../domain/valueObjects/CustodyValueObjects';

export interface TransferCustodyRequestDTO {
  identityTokenId: string;
  destinationOwner: string;
  reason: TransferReason;
  actorId: string;
  correlationId?: string;
}

export interface CustodySnapshotDTO {
  identityTokenId: string;
  currentOwner: string;
  lastMovementAt: string;
  totalMovements: number;
}

export interface CustodyMovementDTO {
  id: string;
  fromOwner: string;
  toOwner: string;
  reason: TransferReason;
  performedAt: string;
  operatorId: string;
}

export interface CustodyTimelineDTO {
  identityTokenId: string;
  currentOwner: string;
  movements: CustodyMovementDTO[];
}
