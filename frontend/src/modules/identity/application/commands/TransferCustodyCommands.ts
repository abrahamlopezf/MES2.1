import { CustodyOwner, TransferReason } from '../valueObjects/CustodyValueObjects';

export class TransferIdentityCustodyCommand {
  constructor(
    public readonly identityTokenId: string,
    public readonly destinationOwner: CustodyOwner,
    public readonly reason: TransferReason,
    public readonly actorId: string,
    public readonly correlationId?: string
  ) {}
}
