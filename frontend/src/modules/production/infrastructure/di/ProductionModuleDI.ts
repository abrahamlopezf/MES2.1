import { ExecuteMixingHandler } from '../../application/handlers/ExecuteMixingHandler';
import { InMemoryDomainEventBus } from '../../../identity/infrastructure/events/InMemoryDomainEventBus';
import { UuidGeneratorPort, ClockPort } from '../../../../shared/domain/ports/DomainPorts';
import { MixBatch } from '../../domain/entities/MixBatch';
import { MixTransformation } from '../../domain/entities/MixTransformation';
import { ProductionRepository } from '../../application/ports/ProductionRepository';
import { WarehouseMaterialConsumedHandler } from '../../../warehouse/application/handlers/WarehouseMaterialConsumedHandler';
import { warehouseRepository } from '../../../warehouse/infrastructure/di/WarehouseModuleDI';
import { ProductionUseCaseFacadeImpl } from '../facades/ProductionUseCaseFacadeImpl';
import { MachineHealthState } from '../../domain/entities/MachineHealthState';
import { StationExecutionState } from '../../domain/entities/StationExecutionState';
import { ExtrusionTransformation } from '../../domain/entities/ExtrusionTransformation';
import { Rack } from '../../domain/entities/Rack';
import { ExtrusionHandlers } from '../../application/handlers/ExtrusionHandlers';
import { RegisterRackHandler } from '../../application/handlers/RegisterRackHandler';
import { TraceTransformationCompletedHandler } from '../../../traceability/application/handlers/TraceTransformationCompletedHandler';

// -- Mock Repository --
class InMemoryProductionRepository implements ProductionRepository {
  private batches: Map<string, MixBatch> = new Map();
  private transformations: Map<string, MixTransformation> = new Map();
  private extrusionTransformations: Map<string, ExtrusionTransformation> = new Map();
  private racks: Map<string, Rack> = new Map();
  private machineHealths: Map<string, MachineHealthState> = new Map();
  private stationExecutions: Map<string, StationExecutionState> = new Map();

  constructor() {
    this.seedStates();
  }

  private seedStates() {
    // Initial states matching the Catalog mock IDs
    this.stationExecutions.set('ST-MIX-01', new StationExecutionState('ST-MIX-01', 'RUNNING', 'TRANS-FAKE-123', 'OP-Juan', new Date()));
    this.stationExecutions.set('ST-EXT-01', new StationExecutionState('ST-EXT-01', 'RESERVED', null, 'OP-Pedro', null));
    
    this.machineHealths.set('M-MIX-01', new MachineHealthState('M-MIX-01', 'ST-MIX-01', 'ONLINE'));
    this.machineHealths.set('M-MIX-02', new MachineHealthState('M-MIX-02', 'ST-MIX-01', 'ONLINE'));
    this.machineHealths.set('M-EXT-01', new MachineHealthState('M-EXT-01', 'ST-EXT-01', 'MAINTENANCE'));
    this.machineHealths.set('M-EXT-02', new MachineHealthState('M-EXT-02', 'ST-EXT-01', 'ONLINE'));
  }

  async saveMixBatch(batch: MixBatch): Promise<void> {
    this.batches.set(batch.id, batch);
  }
  async saveMixTransformation(transformation: MixTransformation): Promise<void> {
    this.transformations.set(transformation.id, transformation);
  }

  async saveExtrusionTransformation(transformation: ExtrusionTransformation): Promise<void> {
    this.extrusionTransformations.set(transformation.id, transformation);
  }

  async getExtrusionTransformation(id: string): Promise<ExtrusionTransformation | null> {
    return this.extrusionTransformations.get(id) || null;
  }

  async saveRack(rack: Rack): Promise<void> {
    this.racks.set(rack.id, rack);
  }

  async getRack(id: string): Promise<Rack | null> {
    return this.racks.get(id) || null;
  }

  async getMachineHealth(machineId: string): Promise<MachineHealthState | null> {
    return this.machineHealths.get(machineId) || null;
  }
  
  async saveMachineHealth(state: MachineHealthState): Promise<void> {
    this.machineHealths.set(state.machineId, state);
  }
  
  async getAllMachineHealths(): Promise<MachineHealthState[]> {
    return Array.from(this.machineHealths.values());
  }

  async getStationExecution(stationId: string): Promise<StationExecutionState | null> {
    return this.stationExecutions.get(stationId) || null;
  }
  
  async saveStationExecution(state: StationExecutionState): Promise<void> {
    this.stationExecutions.set(state.stationId, state);
  }
  
  async getAllStationExecutions(): Promise<StationExecutionState[]> {
    return Array.from(this.stationExecutions.values());
  }
}

const uuidGenerator: UuidGeneratorPort = { generate: () => crypto.randomUUID() };
const clock: ClockPort = { now: () => new Date() };
const eventBus = new InMemoryDomainEventBus();
const productionRepository = new InMemoryProductionRepository();

// --- Handlers ---
export const executeMixingHandler = new ExecuteMixingHandler(
  productionRepository,
  eventBus,
  uuidGenerator,
  clock
);

// --- Extrusion Handlers ---
export const extrusionHandlers = new ExtrusionHandlers(
  productionRepository,
  eventBus,
  uuidGenerator,
  clock
);

export const registerRackHandler = new RegisterRackHandler(productionRepository);

// For Traceability:
const traceHandler = new TraceTransformationCompletedHandler();
eventBus.subscribe('TransformationCompletedEvent', (e) => traceHandler.handle(e));

// For Warehouse:
const warehouseConsumedHandler = new WarehouseMaterialConsumedHandler(warehouseRepository);
eventBus.subscribe('MaterialConsumedEvent', (e) => warehouseConsumedHandler.handle(e));

// --- Facade ---
export const productionFacade = new ProductionUseCaseFacadeImpl(
  executeMixingHandler,
  extrusionHandlers,
  registerRackHandler,
  productionRepository
);
