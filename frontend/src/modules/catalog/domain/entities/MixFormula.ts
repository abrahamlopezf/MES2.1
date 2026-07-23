import { ProcessDefinition } from './ProcessDefinition';
import { UnitOfMeasure } from '../valueObjects/UnitOfMeasure';

export interface FormulaIngredient {
  materialId: string;
  expectedQuantity: number;
  unit: UnitOfMeasure;
}

export class MixFormula extends ProcessDefinition {
  constructor(
    id: string,
    name: string,
    public readonly ingredients: FormulaIngredient[],
    public readonly expectedOutputUnit: UnitOfMeasure,
    version?: string,
    effectiveFrom?: Date,
    effectiveTo?: Date
  ) {
    super(id, name, 'MIX_FORMULA', version, effectiveFrom, effectiveTo);
  }
}
