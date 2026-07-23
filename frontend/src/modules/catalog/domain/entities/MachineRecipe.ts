import { ProcessDefinition } from './ProcessDefinition';

export interface MachineParameter {
  key: string;
  targetValue: number;
  unit: string;
  tolerancePlus?: number;
  toleranceMinus?: number;
}

export class MachineRecipe extends ProcessDefinition {
  constructor(
    id: string,
    name: string,
    public readonly parameters: MachineParameter[],
    version?: string,
    effectiveFrom?: Date,
    effectiveTo?: Date
  ) {
    super(id, name, 'MACHINE_RECIPE', version, effectiveFrom, effectiveTo);
  }
}
