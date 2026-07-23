import { Quantity } from '../../domain/valueObjects/WarehouseValueObjects';

export class RegisterMaterialEntryCommand {
  constructor(
    public readonly identityTokenId: string,
    public readonly materialId: string,
    public readonly quantity: Quantity,
    public readonly locationId: string,
    public readonly operatorId: string,
    public readonly idempotencyKey?: string
  ) {}
}
