import { TransferIdentityCustodyCommand } from '../commands/TransferCustodyCommands';
import { IdentityCustodyRepository } from '../../domain/repositories/IdentityCustodyRepository';
import { ClockPort, DomainEventBus, UuidGeneratorPort } from '@shared/domain/ports/DomainPorts';
import { UserId } from '@shared/ids/brandTypes';
import { PermissionSet } from '@core/authorization/PermissionSet';

export class TransferIdentityCustodyHandler {
  constructor(
    private readonly repository: IdentityCustodyRepository,
    private readonly eventBus: DomainEventBus,
    private readonly uuidGenerator: UuidGeneratorPort,
    private readonly clock: ClockPort
  ) {}

  public async execute(command: TransferIdentityCustodyCommand, permissions: PermissionSet): Promise<void> {
    if (!permissions.can('identity.custody.transfer')) {
      throw new Error("Privilegios insuficientes para transferir custodia de identidades.");
    }

    // 1. Cargar el Ledger completo
    const ledger = await this.repository.findLedger(command.identityTokenId);
    if (!ledger) {
      throw new Error(`IdentityCustodyLedger no encontrado para el token ${command.identityTokenId}.`);
    }

    // 2. Ejecutar dominio (valida lógicas y agrega el evento al array de eventos del aggregate)
    ledger.transfer(
      command.destinationOwner,
      command.reason,
      command.actorId as UserId,
      this.clock,
      this.uuidGenerator,
      command.correlationId
    );

    // 3. Persistir Ledger (se encarga de actualizar el Snapshot dentro de su implementación real)
    await this.repository.saveLedger(ledger);

    // 4. Publicar eventos (IdentityCustodyTransferredEvent)
    await this.eventBus.publishAll(ledger.pullEvents());
  }
}
