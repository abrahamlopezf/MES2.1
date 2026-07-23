import { GenerateBatchCommand } from '../commands/GenerateBatchCommand';
import { IdentityCommandRepository } from '../../domain/repositories/IdentityRepository';
import { IndustrialCodeGeneratorPort } from '../../domain/ports/IndustrialCodeGeneratorPort';
import { ClockPort, DomainEventBus, UuidGeneratorPort } from '@shared/domain/ports/DomainPorts';
import { PermissionSet } from '@core/authorization/PermissionSet';
import { IdentityBatch } from '../../domain/entities/IdentityBatch';
import { QrBatchId } from '@shared/ids/brandTypes';

// DTO de resultado interno para devolver al Presentation Layer
export interface GenerateBatchResult {
  batchId: string;
  batchNumber: string;
  generatedCount: number;
}

/**
 * Handler CQRS: Coordina el proceso de Generación de un Lote.
 * Flujo: Permisos -> Crear Agregado -> Aggregate.generateTokens() -> Repositorio -> EventBus.
 */
export class GenerateBatchHandler {
  constructor(
    private readonly repository: IdentityCommandRepository,
    private readonly codeGenerator: IndustrialCodeGeneratorPort,
    private readonly eventBus: DomainEventBus,
    private readonly uuidGenerator: UuidGeneratorPort,
    private readonly clock: ClockPort
  ) {}

  public async execute(
    command: GenerateBatchCommand, 
    permissions: PermissionSet
  ): Promise<GenerateBatchResult> {
    
    // 1. Autorización: Policy Evaluation
    if (!permissions.can('identity.batch.generate')) {
      throw new Error("Privilegios insuficientes para generar lotes de identidad.");
    }

    // 2. Creación del Aggregate Root
    const batchId = this.uuidGenerator.generate() as QrBatchId;
    
    // Asignación de Batch Number (simplificado, podría requerir otro puerto)
    const year = this.clock.now().getFullYear().toString().slice(-2);
    const batchNumber = `B-${command.plantId}-${year}-${batchId.slice(0, 4)}`; 

    const batch = IdentityBatch.create(
      {
        id: batchId,
        batchNumber,
        plantId: command.plantId,
        areaId: command.areaId,
        tokenType: command.tokenType,
        requestedBy: command.requestedByUserId
      },
      this.clock
    );

    // 3. El Agregado decide y orquesta sus internas (generación de hijos)
    await batch.generateTokens(
      command.amount,
      this.codeGenerator,
      this.uuidGenerator,
      this.clock
    );

    // 4. Persistir estado (Write Model)
    await this.repository.saveBatch(batch);

    // 5. Publicar eventos encolados
    const events = batch.pullEvents();
    await this.eventBus.publishAll(events);

    // 6. Retornar Result DTO
    return {
      batchId: batch.id as string,
      batchNumber: batch.batchNumber.value,
      generatedCount: batch.tokenCount
    };
  }
}
