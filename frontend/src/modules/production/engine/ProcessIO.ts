import { UnitOfMeasure } from '../../../catalog/domain/valueObjects/UnitOfMeasure';

export class TransformationInput {
  constructor(
    public readonly identityTokenId: string,
    public readonly quantity: number,
    public readonly unit: UnitOfMeasure
  ) {}
}

export class TransformationOutput {
  constructor(
    public readonly identityTokenId: string,
    public readonly quantity: number,
    public readonly unit: UnitOfMeasure
  ) {}
}
