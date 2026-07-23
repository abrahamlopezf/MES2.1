export class ExecuteMixingCommand {
  constructor(
    public readonly formulaId: string,
    public readonly outputIdentityTokenId: string,
    public readonly stationId: string,
    public readonly operatorId: string,
    public readonly inputs: {
      identityTokenId: string;
      stockUnitId: string;
      materialId: string;
      quantity: number;
      unit: string;
    }[],
    public readonly outputQuantity: number,
    public readonly outputUnit: string
  ) {}
}
