import { InMemoryIdentityRepository } from '../repositories/InMemoryIdentityRepository';
import { InMemoryDomainEventBus } from '../events/InMemoryDomainEventBus';
import { GenerateBatchHandler } from '../../application/handlers/GenerateBatchHandler';
import { IdentityUseCaseFacadeImpl } from '../facades/IdentityUseCaseFacadeImpl';
import { ClockPort, UuidGeneratorPort } from '@shared/domain/ports/DomainPorts';
import { IndustrialCodeGeneratorPort } from '../../domain/ports/IndustrialCodeGeneratorPort';
import { PlantId, AreaId } from '@shared/ids/brandTypes';
import { TokenTypeValue } from '../../domain/valueObjects/IdentityValueObjects';
import { IndustrialCode } from '@shared/valueObjects/IndustrialCode';

// -- Fake Implementations of Ports --
class BrowserClock implements ClockPort {
  now(): Date { return new Date(); }
}

class UuidV4Generator implements UuidGeneratorPort {
  generate(): string { return crypto.randomUUID(); }
}

class SequentialIndustrialCodeGenerator implements IndustrialCodeGeneratorPort {
  private counter = 1;
  async generateCodes(plantId: PlantId, areaId: AreaId, type: TokenTypeValue, amount: number): Promise<IndustrialCode[]> {
    const codes = [];
    for (let i = 0; i < amount; i++) {
      const year = new Date().getFullYear().toString().slice(-2);
      // El regex esperaba: Planta(3) - Año(2) - Area(3) - Secuencia(6)
      // const codeString = `${plantId}-${year}-${areaId}-${this.counter.toString().padStart(6, '0')}`;
      
      // Nuevo formato sin Planta
      const codeString = `${year}-${areaId}-${this.counter.toString().padStart(6, '0')}`;
      codes.push(IndustrialCode.create(codeString));
      this.counter++;
    }
    return codes;
  }
}

// -- Instancias Singleton (Mock Dependency Injection) --
const repository = new InMemoryIdentityRepository();
const eventBus = new InMemoryDomainEventBus();
const clock = new BrowserClock();
const uuidGenerator = new UuidV4Generator();
const codeGenerator = new SequentialIndustrialCodeGenerator();

// -- Registrar Event Handlers Reales --
import { AuditIdentityGenerationHandler } from '../events/handlers/AuditIdentityGenerationHandler';
const auditHandler = new AuditIdentityGenerationHandler();
eventBus.subscribe('IdentityGenerated', (e) => auditHandler.handle(e as any));

// Handlers
import { ApproveIdentificationRequestHandler } from '../../application/handlers/ApproveIdentificationRequestHandler';
import { RejectIdentificationRequestHandler } from '../../application/handlers/RejectIdentificationRequestHandler';

const generateBatchHandler = new GenerateBatchHandler(repository, codeGenerator, eventBus, uuidGenerator, clock);
const approveBatchHandler = new ApproveIdentificationRequestHandler(repository, eventBus, uuidGenerator, clock);
const rejectBatchHandler = new RejectIdentificationRequestHandler(repository, eventBus, uuidGenerator, clock);

// MOCK: Generar una solicitud inicial en el repo para que aparezca en la UI
import { IdentificationRequest } from '../../domain/entities/IdentificationRequest';
const mockRequest = IdentificationRequest.create(uuidGenerator.generate(), 'MTY' as any, 'EXT' as any, 'QR', 500, 'supervisor-1' as any, clock);
repository.saveRequest(mockRequest);

// Print Pipeline Dependencies
import { InMemoryPrintJobRepository } from '../repositories/InMemoryPrintJobRepository';
import { CreatePrintJobHandler } from '../../application/handlers/CreatePrintJobHandler';

const printJobRepo = new InMemoryPrintJobRepository();
const createPrintJobHandler = new CreatePrintJobHandler(printJobRepo, repository, eventBus, uuidGenerator, clock);

// Custody Pipeline Dependencies
import { InMemoryIdentityCustodyRepository } from '../repositories/InMemoryIdentityCustodyRepository';
import { TransferIdentityCustodyHandler } from '../../application/handlers/TransferIdentityCustodyHandler';
import { GetCustodyTimelineHandler } from '../../application/handlers/GetCustodyTimelineHandler';
import { IdentityCustodyLedger } from '../../domain/entities/IdentityCustodyLedger';

const custodyRepository = new InMemoryIdentityCustodyRepository();
const transferCustodyHandler = new TransferIdentityCustodyHandler(custodyRepository, eventBus, uuidGenerator, clock);
const getCustodyTimelineHandler = new GetCustodyTimelineHandler(custodyRepository);

// Generar token dummy para pruebas de Custodia
const dummyTokenId = 'MTY-26-EXT-000001';
const initialLedger = IdentityCustodyLedger.initialize(dummyTokenId, 'ALMACEN_CENTRAL', 'system' as any, clock, uuidGenerator);
custodyRepository.saveLedger(initialLedger);


// Facade Exportada para la UI
export const identityFacade = new IdentityUseCaseFacadeImpl(
  generateBatchHandler, 
  approveBatchHandler, 
  rejectBatchHandler,
  createPrintJobHandler,
  transferCustodyHandler,
  getCustodyTimelineHandler,
  custodyRepository,
  repository
);
