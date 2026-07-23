import { AggregateRoot } from '../../../../shared/domain/AggregateRoot';
import { ProcessContext } from '../../engine/ProcessContext';
import { TransformationInput, TransformationOutput } from '../../engine/ProcessIO';
import { MaterialConsumedEvent, TransformationCompletedEvent } from '../events/ProductionEvents';

export class ExtrusionTransformation extends AggregateRoot {
  private _status: 'RUNNING' | 'COMPLETED' | 'ABORTED' = 'RUNNING';

  private constructor(
    public readonly id: string,
    public readonly recipeId: string, // MachineRecipe
    public readonly context: ProcessContext,
    public readonly inputs: TransformationInput[], // Usually 1 MixBatch
    public readonly partialOutputs: TransformationOutput[] = []
  ) {
    super();
  }

  get status() { return this._status; }

  public static start(
    id: string,
    recipeId: string,
    context: ProcessContext,
    consumedMixBatchQR: string,
    mixQuantity: number,
    mixUnit: string
  ): ExtrusionTransformation {
    const inputs = [new TransformationInput(consumedMixBatchQR, mixQuantity, mixUnit as any)];
    
    const extrusion = new ExtrusionTransformation(id, recipeId, context, inputs);

    // Emit event that the MixBatch was consumed by this extrusion
    extrusion.addDomainEvent(new MaterialConsumedEvent(
      id,
      consumedMixBatchQR,
      'MIX-BATCH-INTERNAL', // Dummy or actual internal stock unit for the mix
      'MIX-000', // The mixed material ID
      mixQuantity,
      mixUnit as any,
      context.operator,
      context.station,
      context.startedAt
    ));

    return extrusion;
  }

  public registerPartialOutput(
    identityTokenId: string, 
    quantity: number, 
    unit: string,
    operatorId: string,
    timestamp: Date = new Date()
  ) {
    if (this._status !== 'RUNNING') throw new Error('Cannot register output on a non-running extrusion');
    
    this.partialOutputs.push(new TransformationOutput(identityTokenId, quantity, unit as any));
  }

  public complete(finishedAt: Date = new Date()): void {
    if (this._status !== 'RUNNING') throw new Error('Extrusion is not running');
    
    this._status = 'COMPLETED';

    this.addDomainEvent(new TransformationCompletedEvent(
      this.id,
      'EXTRUSION_TRANSFORMATION',
      this.inputs,
      this.partialOutputs,
      this.recipeId,
      this.context.operator,
      this.context.station,
      this.context.startedAt,
      finishedAt
    ));
  }
}
