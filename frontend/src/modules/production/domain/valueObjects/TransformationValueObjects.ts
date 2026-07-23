import { UnitOfMeasure } from '../../../catalog/domain/valueObjects/UnitOfMeasure';

export class TransformationMetadata {
  constructor(
    public readonly stationId: string,
    public readonly operatorId: string,
    public readonly startedAt: Date,
    public readonly finishedAt?: Date,
    public readonly shift?: string
  ) {}
}

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

export class WeightMeasurement {
  constructor(
    public readonly value: number,
    public readonly unit: UnitOfMeasure,
    public readonly capturedAt: Date,
    public readonly deviceId: string,
    public readonly confidence: number
  ) {}
}
