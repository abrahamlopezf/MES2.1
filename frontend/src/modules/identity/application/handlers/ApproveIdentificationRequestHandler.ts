import { ApproveIdentificationRequestCommand } from '../commands/ApprovalCommands';
import { IdentityCommandRepository } from '../../domain/repositories/IdentityRepository';
import { ClockPort, DomainEventBus, UuidGeneratorPort } from '@shared/domain/ports/DomainPorts';
import { PermissionSet } from '@core/authorization/PermissionSet';
import { UserId } from '@shared/ids/brandTypes';

export class ApproveIdentificationRequestHandler {
  constructor(
    private readonly repository: IdentityCommandRepository,
    private readonly eventBus: DomainEventBus,
    private readonly uuidGenerator: UuidGeneratorPort,
    private readonly clock: ClockPort
  ) {}

  public async execute(command: ApproveIdentificationRequestCommand, permissions: PermissionSet): Promise<void> {
    if (!permissions.can('identity.batch.approve')) {
      throw new Error("Privilegios insuficientes para aprobar solicitudes de lote.");
    }

    const request = await this.repository.findRequest(command.requestId);
    if (!request) {
      throw new Error(`Solicitud ${command.requestId} no encontrada.`);
    }

    request.approve(command.approverUserId as UserId, this.clock, this.uuidGenerator);

    await this.repository.saveRequest(request);

    await this.eventBus.publishAll(request.pullEvents());
  }
}
