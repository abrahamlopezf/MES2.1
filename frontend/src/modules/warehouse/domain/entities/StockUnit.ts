import { AggregateRoot } from '../../../../shared/domain/AggregateRoot';
import { StockUnitCreatedEvent } from '../events/WarehouseEvents';
import { StockUnitStatus, LocationId, Quantity } from '../valueObjects/WarehouseValueObjects';
import { ClockPort, UuidGeneratorPort } from '../../../../shared/domain/ports/DomainPorts';

export class StockUnit extends AggregateRoot {
  constructor(
    public readonly id: string,
    public readonly identityTokenId: string,
    public readonly materialId: string,
    private _quantity: Quantity,
    public readonly warehouseLocation: LocationId,
    public readonly receivedBy: string,
    private _status: StockUnitStatus,
    public readonly receivedAt: Date
  ) {
    super();
  }

  get quantity(): Quantity { return this._quantity; }
  get status(): StockUnitStatus { return this._status; }

  public static create(
    id: string,
    identityTokenId: string,
    materialId: string,
    quantity: Quantity,
    warehouseLocation: LocationId,
    receivedBy: string,
    clock: ClockPort,
    uuidGenerator: UuidGeneratorPort,
    correlationId?: string
  ): StockUnit {
    const receivedAt = clock.now();
    const stockUnit = new StockUnit(
      id,
      identityTokenId,
      materialId,
      quantity,
      warehouseLocation,
      receivedBy,
      StockUnitStatus.AVAILABLE,
      receivedAt
    );

    stockUnit.addDomainEvent(
      new StockUnitCreatedEvent(
        uuidGenerator.generate(),
        stockUnit.id,
        receivedAt,
        stockUnit.identityTokenId,
        stockUnit.materialId,
        stockUnit.quantity.amount,
        stockUnit.quantity.unit,
        stockUnit.warehouseLocation,
        stockUnit.receivedBy,
        correlationId
      )
    );

    return stockUnit;
  }

  public consume(amount: number): void {
    if (this._status !== StockUnitStatus.AVAILABLE) {
      throw new Error(`Cannot consume from StockUnit ${this.id} in status ${this._status}`);
    }
    if (this._quantity.amount < amount) {
      throw new Error(`Insufficient quantity in StockUnit ${this.id}`);
    }

    this._quantity = { amount: this._quantity.amount - amount, unit: this._quantity.unit };

    if (this._quantity.amount === 0) {
      this._status = StockUnitStatus.CONSUMED;
    }
  }
}
