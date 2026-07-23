import { DomainEvent } from '../../../../shared/domain/events/DomainEvent';
import { TransformationInput, TransformationOutput } from '../valueObjects/TransformationValueObjects';

export class MaterialConsumedEvent extends DomainEvent {
  constructor(
    public readonly transformationId: string,
    public readonly inputIdentityTokenId: string,
    public readonly stockUnitId: string,
    public readonly materialId: string,
    public readonly consumedQuantity: number,
    public readonly unit: string,
    public readonly performedBy: string,
    public readonly stationId: string,
    public readonly occurredAt: Date
  ) {
    super('MaterialConsumedEvent');
  }
}

export class TransformationCompletedEvent extends DomainEvent {
  constructor(
    public readonly transformationId: string,
    public readonly type: string,
    public readonly inputs: TransformationInput[],
    public readonly outputs: TransformationOutput[],
    public readonly formulaId: string,
    public readonly operatorId: string,
    public readonly stationId: string,
    public readonly startedAt: Date,
    public readonly finishedAt: Date
  ) {
    super('TransformationCompletedEvent');
  }
}
