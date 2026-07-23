import { WarehouseUseCaseFacade } from '../../application/ports/WarehouseUseCaseFacade';
import { RegisterMaterialEntryRequestDTO, RegisterMaterialEntryResponseDTO } from '../../application/dto/WarehouseDTOs';
import { RegisterMaterialEntryCommand } from '../../application/commands/RegisterMaterialEntryCommand';
import { RegisterMaterialEntryHandler } from '../../application/handlers/RegisterMaterialEntryHandler';
import { PermissionSet } from '../../../../core/authorization/PermissionSet';
import { WarehouseRepository } from '../../application/ports/WarehouseRepository';

export class WarehouseUseCaseFacadeImpl implements WarehouseUseCaseFacade {
  constructor(
    private readonly handler: RegisterMaterialEntryHandler,
    private readonly repository: WarehouseRepository
  ) {}

  async registerMaterialEntry(request: RegisterMaterialEntryRequestDTO): Promise<RegisterMaterialEntryResponseDTO> {
    const command = new RegisterMaterialEntryCommand(
      request.identityTokenId,
      request.materialId,
      { amount: request.amount, unit: request.unit },
      request.locationId,
      request.operatorId
    );

    const permissions = new PermissionSet(request.operatorId as any, new Set(['warehouse.entry.register']));

    const stockUnitId = await this.handler.execute(command, permissions);
    
    const stockUnit = await this.repository.getStockUnitById(stockUnitId);
    
    return {
      stockUnitId: stockUnitId,
      status: stockUnit?.status || 'UNKNOWN',
      receivedAt: stockUnit?.receivedAt?.toISOString() || new Date().toISOString()
    };
  }
}
