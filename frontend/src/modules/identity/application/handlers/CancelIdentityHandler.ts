import { CancelIdentityCommand } from '../commands/CancelIdentityCommand';
import { IdentityCommandRepository } from '../../domain/repositories/IdentityRepository';
import { ClockPort, DomainEventBus, UuidGeneratorPort } from '@shared/domain/ports/DomainPorts';
import { PermissionSet } from '@core/authorization/PermissionSet';
import { IdentityTokenId } from '@shared/ids/brandTypes';

/**
 * Orquesta el caso de uso "Cancelar Identidad".
 * Flujo: Cargar Agregado -> Ejecutar Dominio -> Guardar -> Publicar Eventos.
 */
export class CancelIdentityHandler {
  constructor(
    private readonly repository: IdentityCommandRepository,
    private readonly eventBus: DomainEventBus,
    private readonly clock: ClockPort,
    private readonly uuidGenerator: UuidGeneratorPort
  ) {}

  public async execute(command: CancelIdentityCommand, permissions: PermissionSet): Promise<void> {
    // 1. Cargar la entidad
    const token = await this.repository.findToken(command.tokenId as IdentityTokenId);
    
    if (!token) {
      throw new Error(`Token ${command.tokenId} no encontrado.`);
    }

    // 2. Ejecutar la regla de negocio (la entidad muta y encola eventos)
    token.cancel(permissions, command.reason, this.clock, this.uuidGenerator);

    // 3. Persistir el nuevo estado
    await this.repository.saveToken(token);

    // 4. Publicar los eventos de dominio encolados (Outbox/EventBus)
    const events = token.pullEvents();
    await this.eventBus.publishAll(events);
  }
}
