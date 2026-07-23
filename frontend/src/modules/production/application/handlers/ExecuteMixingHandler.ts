import { ExecuteMixingCommand } from '../commands/ExecuteMixingCommand';
import { ProductionRepository } from '../ports/ProductionRepository';
import { DomainEventBusPort } from '../../../../shared/domain/events/DomainEventBusPort';
import { ClockPort, UuidGeneratorPort } from '../../../../shared/domain/ports/DomainPorts';
import { MixTransformation } from '../../domain/entities/MixTransformation';
import { MixBatch } from '../../domain/entities/MixBatch';
import { ProcessContext } from '../../engine/ProcessContext';

export class ExecuteMixingHandler {
  constructor(
    private readonly repository: ProductionRepository,
    private readonly eventBus: DomainEventBusPort,
    private readonly uuidGenerator: UuidGeneratorPort,
    private readonly clock: ClockPort
  ) {}

  public async execute(command: ExecuteMixingCommand): Promise<string> {
    const transformationId = this.uuidGenerator.generate();
    const batchId = this.uuidGenerator.generate();
    const now = this.clock.now();

    const context = new ProcessContext(
      'PLANT-01',
      'AREA-PROD-01',
      command.stationId,
      'MACHINE-MOCK-01', // Se tomaría del registry de máquinas de la estación
      command.operatorId,
      'TURNO-1',
      command.formulaId,
      now, // startedAt (simulado instantaneo)
      now  // finishedAt
    );

    const mixTransformation = MixTransformation.execute(
      transformationId,
      command.formulaId,
      context,
      command.inputs,
      command.outputIdentityTokenId,
      command.outputQuantity,
      command.outputUnit
    );

    const mixBatch = MixBatch.create(
      batchId,
      command.outputIdentityTokenId,
      command.formulaId,
      command.outputQuantity,
      command.outputUnit,
      now
    );

    await this.repository.saveMixTransformation(mixTransformation);
    await this.repository.saveMixBatch(mixBatch);

    await this.eventBus.publishAll(mixTransformation.getDomainEvents());
    mixTransformation.clearDomainEvents();

    return transformationId;
  }
}
