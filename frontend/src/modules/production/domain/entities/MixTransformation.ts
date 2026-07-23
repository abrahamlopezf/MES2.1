import { AggregateRoot } from '../../../../shared/domain/AggregateRoot';
import { ProcessContext } from '../../engine/ProcessContext';
import { TransformationInput, TransformationOutput } from '../../engine/ProcessIO';
import { MaterialConsumedEvent, TransformationCompletedEvent } from '../events/ProductionEvents';

export class MixTransformation extends AggregateRoot {
  private constructor(
    public readonly id: string,
    public readonly formulaId: string,
    public readonly context: ProcessContext,
    public readonly inputs: TransformationInput[],
    public readonly outputs: TransformationOutput[]
  ) {
    super();
  }

  public static execute(
    id: string,
    formulaId: string,
    context: ProcessContext,
    inputs: { identityTokenId: string, stockUnitId: string, materialId: string, quantity: number, unit: string }[],
    outputIdentityTokenId: string,
    outputQuantity: number,
    outputUnit: string
  ): MixTransformation {
    
    const transformationInputs = inputs.map(i => new TransformationInput(i.identityTokenId, i.quantity, i.unit as any));
    const transformationOutputs = [new TransformationOutput(outputIdentityTokenId, outputQuantity, outputUnit as any)];
    
    const mix = new MixTransformation(
      id,
      formulaId,
      context,
      transformationInputs,
      transformationOutputs
    );

    // Emit consumed events for warehouse
    inputs.forEach(input => {
      mix.addDomainEvent(new MaterialConsumedEvent(
        id,
        input.identityTokenId,
        input.stockUnitId,
        input.materialId,
        input.quantity,
        input.unit,
        context.operator,
        context.station,
        context.finishedAt || new Date()
      ));
    });

    // Emit completed event for traceability
    mix.addDomainEvent(new TransformationCompletedEvent(
      id,
      'MIX_TRANSFORMATION',
      transformationInputs,
      transformationOutputs,
      formulaId,
      context.operator,
      context.station,
      context.startedAt,
      context.finishedAt || new Date()
    ));

    return mix;
  }
}
