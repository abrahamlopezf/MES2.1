import { StartProductionRunCommand } from '../commands/StartProductionRunCommand';
import { ProductionRun } from '../../domain/entities/ProductionRun';
import { ProductionRepository } from '../ports/ProductionRepository';
import { IdentityAssignmentPort } from '../ports/IdentityAssignmentPort';
import { DomainEventBusPort } from '../../../../shared/domain/events/DomainEventBusPort';
import { ClockPort, UuidGeneratorPort } from '../../../../shared/domain/ports/DomainPorts';
import { PermissionSet } from '../../../../core/authorization/PermissionSet';

export class StartProductionRunHandler {
  constructor(
    private readonly repository: ProductionRepository,
    private readonly identityPort: IdentityAssignmentPort,
    private readonly eventBus: DomainEventBusPort,
    private readonly uuidGenerator: UuidGeneratorPort,
    private readonly clock: ClockPort
  ) {}

  public async execute(command: StartProductionRunCommand, permissions: PermissionSet): Promise<string> {
    // 1. Autorización
    permissions.require('production.run.start');

    // 2. Validar que la Orden existe y está lista
    const order = await this.repository.findOrderById(command.productionOrderId);
    if (!order) {
      throw new Error(`Production Order ${command.productionOrderId} no encontrada.`);
    }

    // 3. Crear Aggregate Root de Ejecución (ProductionRun)
    const runId = this.uuidGenerator.generate();
    const productionRun = new ProductionRun(
      runId,
      command.productionOrderId,
      command.stationId,
      command.operatorId
    );

    // 4. Iniciar ejecución y reservar materiales lógicamente
    productionRun.startExecution(
      command.reservedInputs, 
      this.clock, 
      this.uuidGenerator, 
      command.idempotencyKey
    );

    // 5. Solicitar identidad para el output (Integración con Identity Center)
    // Asumiremos que el output principal hereda la configuración del Order/SKU
    productionRun.requestIdentityAssignment(
      order.productId, // En un sistema real usaríamos el OutputDefinitionId del BOM
      this.clock,
      this.uuidGenerator,
      command.idempotencyKey
    );

    // (Opcional en Sincrónico) Si el IdentityPort responde de inmediato:
    // const newIdentity = await this.identityPort.assignIdentity(runId, order.productId);
    // if (newIdentity) productionRun.linkOutputIdentity(newIdentity);

    // 6. Guardar estado
    await this.repository.saveRun(productionRun);

    // 7. Publicar Eventos (ProductionRunStartedEvent, IdentityAssignmentRequestedEvent)
    await this.eventBus.publishAll(productionRun.getDomainEvents());
    productionRun.clearDomainEvents();

    return runId;
  }
}
