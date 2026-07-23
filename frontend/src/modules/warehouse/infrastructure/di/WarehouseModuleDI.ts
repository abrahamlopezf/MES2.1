import { InMemoryWarehouseRepository } from '../repositories/InMemoryWarehouseRepository';
import { RegisterMaterialEntryHandler } from '../../application/handlers/RegisterMaterialEntryHandler';
import { WarehouseUseCaseFacadeImpl } from '../facades/WarehouseUseCaseFacadeImpl';
import { InMemoryDomainEventBus } from '../../../identity/infrastructure/events/InMemoryDomainEventBus';
import { UuidGeneratorPort, ClockPort } from '../../../../shared/domain/ports/DomainPorts';
import { TraceStockUnitCreatedHandler } from '../../../traceability/application/handlers/TraceStockUnitCreatedHandler';

// --- Shared Ports ---
const uuidGenerator: UuidGeneratorPort = { generate: () => crypto.randomUUID() };
const clock: ClockPort = { now: () => new Date() };
const eventBus = new InMemoryDomainEventBus();

// --- Repositories ---
export const warehouseRepository = new InMemoryWarehouseRepository();

// --- Handlers ---
const registerMaterialEntryHandler = new RegisterMaterialEntryHandler(
  warehouseRepository,
  eventBus,
  uuidGenerator,
  clock
);

// --- Integrations ---
const traceHandler = new TraceStockUnitCreatedHandler();
eventBus.subscribe('StockUnitCreatedEvent', (e) => traceHandler.handle(e));

// --- Facade ---
export const warehouseFacade = new WarehouseUseCaseFacadeImpl(
  registerMaterialEntryHandler,
  warehouseRepository
);
