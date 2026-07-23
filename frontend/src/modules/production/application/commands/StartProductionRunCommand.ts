import { MaterialRequirement } from '../../domain/valueObjects/ProductionValueObjects';

export class StartProductionRunCommand {
  constructor(
    public readonly productionOrderId: string,
    public readonly stationId: string,
    public readonly operatorId: string,
    public readonly reservedInputs: MaterialRequirement[],
    public readonly idempotencyKey?: string
  ) {}
}
