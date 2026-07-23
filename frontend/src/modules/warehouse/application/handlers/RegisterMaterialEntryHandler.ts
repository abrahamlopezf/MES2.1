import { RegisterMaterialEntryCommand } from '../commands/RegisterMaterialEntryCommand';
import { StockUnit } from '../../domain/entities/StockUnit';
import { WarehouseRepository } from '../ports/WarehouseRepository';
import { DomainEventBusPort } from '../../../../shared/domain/events/DomainEventBusPort';
import { ClockPort, UuidGeneratorPort } from '../../../../shared/domain/ports/DomainPorts';
import { PermissionSet } from '../../../../core/authorization/PermissionSet';

export class RegisterMaterialEntryHandler {
  constructor(
    private readonly repository: WarehouseRepository,
    private readonly eventBus: DomainEventBusPort,
    private readonly uuidGenerator: UuidGeneratorPort,
    private readonly clock: ClockPort
  ) {}

  public async execute(command: RegisterMaterialEntryCommand, permissions: PermissionSet): Promise<string> {
    permissions.require('warehouse.entry.register');

    const stockUnitId = this.uuidGenerator.generate();

    const stockUnit = StockUnit.create(
      stockUnitId,
      command.identityTokenId,
      command.materialId,
      command.quantity,
      command.locationId,
      command.operatorId,
      this.clock,
      this.uuidGenerator,
      command.idempotencyKey
    );

    await this.repository.saveStockUnit(stockUnit);

    await this.eventBus.publishAll(stockUnit.getDomainEvents());
    stockUnit.clearDomainEvents();

    return stockUnit.id;
  }
}
