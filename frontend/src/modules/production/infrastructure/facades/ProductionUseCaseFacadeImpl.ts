import { ProductionUseCaseFacade, ExecuteMixingRequestDTO, StationExecutionStateDTO, MachineHealthStateDTO } from '../../application/ports/ProductionUseCaseFacade';
import { ExecuteMixingCommand } from '../../application/commands/ExecuteMixingCommand';
import { ExecuteMixingHandler } from '../../application/handlers/ExecuteMixingHandler';
import { ExtrusionHandlers } from '../../application/handlers/ExtrusionHandlers';
import { RegisterRackHandler } from '../../application/handlers/RegisterRackHandler';
import { ProductionRepository } from '../../application/ports/ProductionRepository';

export class ProductionUseCaseFacadeImpl implements ProductionUseCaseFacade {
  constructor(
    private readonly executeMixingHandler: ExecuteMixingHandler,
    private readonly extrusionHandlers: ExtrusionHandlers,
    private readonly registerRackHandler: RegisterRackHandler,
    private readonly repository: ProductionRepository
  ) {}

  async executeMixing(request: ExecuteMixingRequestDTO): Promise<{ transformationId: string }> {
    const command = new ExecuteMixingCommand(
      request.formulaId,
      request.outputIdentityTokenId,
      request.stationId,
      request.operatorId,
      request.inputs,
      request.outputQuantity,
      request.outputUnit
    );

    const transformationId = await this.executeMixingHandler.execute(command);
    
    return { transformationId };
  }

  async getAllStationExecutions(): Promise<StationExecutionStateDTO[]> {
    const states = await this.repository.getAllStationExecutions();
    return states.map(s => ({
      stationId: s.stationId,
      status: s.status,
      currentTransformationId: s.currentTransformationId,
      operatorId: s.operatorId,
      startedAt: s.startedAt
    }));
  }

  async getAllMachineHealths(): Promise<MachineHealthStateDTO[]> {
    const healths = await this.repository.getAllMachineHealths();
    return healths.map(h => ({
      machineId: h.machineId,
      stationId: h.stationId,
      status: h.status,
      lastReportedAt: h.lastReportedAt
    }));
  }

  async changeMachineHealth(machineId: string, status: string): Promise<void> {
    const health = await this.repository.getMachineHealth(machineId);
    if (!health) throw new Error('Machine not found');
    health.setStatus(status as any);
    await this.repository.saveMachineHealth(health);
  }

  async startExtrusion(recipeId: string, stationId: string, operatorId: string, mixBatchQR: string): Promise<{ transformationId: string }> {
    const transformationId = await this.extrusionHandlers.startExtrusion(recipeId, stationId, operatorId, mixBatchQR);
    return { transformationId };
  }

  async registerRollToRack(extrusionId: string, rackId: string, rollQR: string, operatorId: string, quantity: number, unit: string): Promise<void> {
    await this.extrusionHandlers.registerRollToRack(extrusionId, rackId, rollQR, operatorId, quantity, unit);
  }

  async registerRack(rackId: string, ptiMaterialId: string, operatorId: string): Promise<void> {
    await this.registerRackHandler.execute(rackId, ptiMaterialId, operatorId);
  }
}
