import { AggregateRoot } from '../../../../shared/domain/AggregateRoot';
import { UnitOfMeasure } from '../../../catalog/domain/valueObjects/UnitOfMeasure';

export interface RollEntry {
  identityTokenId: string;
  materialId: string; // The PTI material (e.g. Rollo Blanco 30cm)
  quantity: number;
  unit: UnitOfMeasure;
  producedAt: Date;
  operatorId: string;
  sourceTransformationId: string; // To link back to Extrusion
}

export type RackStatus = 'OPEN' | 'CLOSED' | 'IN_TRANSIT';

export class Rack extends AggregateRoot {
  private _rolls: RollEntry[] = [];
  
  constructor(
    public readonly id: string, // Rack's own QR
    public readonly ptiMaterialId: string, // What this rack is meant to hold
    private _status: RackStatus = 'OPEN',
    private _createdAt: Date = new Date(),
    private _createdBy: string
  ) {
    super();
  }

  get status(): RackStatus { return this._status; }
  get rolls(): RollEntry[] { return [...this._rolls]; }
  get createdAt(): Date { return this._createdAt; }
  get createdBy(): string { return this._createdBy; }

  get totalQuantity(): number {
    return this._rolls.reduce((sum, r) => sum + r.quantity, 0);
  }

  public addRoll(
    identityTokenId: string, 
    quantity: number, 
    unit: UnitOfMeasure,
    operatorId: string,
    sourceTransformationId: string
  ): void {
    if (this._status !== 'OPEN') {
      throw new Error(`Cannot add rolls to a rack with status: ${this._status}`);
    }

    this._rolls.push({
      identityTokenId,
      materialId: this.ptiMaterialId,
      quantity,
      unit,
      producedAt: new Date(),
      operatorId,
      sourceTransformationId
    });

    // We can emit a RollAddedToRackEvent here if necessary
  }

  public closeRack(operatorId: string): void {
    if (this._status !== 'OPEN') {
      throw new Error('Rack is already closed or in transit');
    }
    this._status = 'CLOSED';
    // Emit RackClosedEvent
  }
}
