import { CreatePrintJobCommand } from '../commands/PrintCommands';
import { PrintJobRepository } from '../../domain/repositories/PrintJobRepository';
import { IdentityCommandRepository } from '../../domain/repositories/IdentityRepository';
import { PrintJob } from '../../domain/entities/PrintJob';
import { ClockPort, DomainEventBus, UuidGeneratorPort } from '@shared/domain/ports/DomainPorts';
import { UserId } from '@shared/ids/brandTypes';
import { PermissionSet } from '@core/authorization/PermissionSet';

export class CreatePrintJobHandler {
  constructor(
    private readonly printJobRepo: PrintJobRepository,
    private readonly identityRepo: IdentityCommandRepository,
    private readonly eventBus: DomainEventBus,
    private readonly uuidGenerator: UuidGeneratorPort,
    private readonly clock: ClockPort
  ) {}

  public async execute(command: CreatePrintJobCommand, permissions: PermissionSet): Promise<string> {
    if (!permissions.can('identity.batch.print')) {
      throw new Error("Privilegios insuficientes para imprimir identidades.");
    }

    // Idempotencia: ¿Ya existe un trabajo con este idempotencyKey?
    const existingJob = await this.printJobRepo.findByIdempotencyKey(command.idempotencyKey);
    if (existingJob) {
      return existingJob.id; // Retornamos el ID existente
    }

    const batch = await this.identityRepo.findBatch(command.batchId);
    if (!batch) {
      throw new Error(`Batch ${command.batchId} no encontrado.`);
    }

    // Nota: Aquí se debería cargar y validar la LabelTemplate a través de un TemplateRepository
    // Para simplificar el flow, asumimos que templateId es válido.

    // Crear Aggregate
    const job = PrintJob.create(
      this.uuidGenerator.generate(),
      batch.id,
      command.templateId,
      command.idempotencyKey,
      batch.generatedCount, // Se imprime todo el lote en este caso de uso
      command.requestedBy as UserId,
      this.clock,
      this.uuidGenerator
    );

    // Encolarlo para impresión (avanza la máquina de estado a QUEUED y emite PrintRequestedEvent)
    job.queueForPrinting(this.clock, this.uuidGenerator);

    await this.printJobRepo.save(job);
    await this.eventBus.publishAll(job.pullEvents());

    return job.id;
  }
}
