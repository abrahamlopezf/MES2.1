import { IdentityTokenId } from '@shared/ids/brandTypes';
import { IndustrialCode } from '@shared/valueObjects/IndustrialCode';
import { IdentityStatus, IdentityStatusValue } from '../valueObjects/IdentityStatus';
import { IdentityAlreadyCancelledError, TokenAlreadyAssignedError } from '../errors/IdentityDomainErrors';
import { CancellationPolicy } from '../policies/authorization/IdentityAuthorizationPolicies';
import { AggregateRoot } from '@shared/domain/AggregateRoot';
import { ClockPort, UuidGeneratorPort } from '@shared/domain/ports/DomainPorts';
import { IdentityCancelled } from '../events/IdentityDomainEvents';
import { PermissionSet } from '@core/authorization/PermissionSet';

/**
 * Entidad: IdentityToken
 * Refactorizada para ser un AggregateRoot y producir Eventos de Dominio.
 */
export class IdentityToken extends AggregateRoot<IdentityTokenId> {
  private constructor(
    public readonly id: IdentityTokenId,
    public readonly industrialCode: IndustrialCode,
    private _status: IdentityStatus,
    public readonly batchId: string
  ) {
    super();
  }

  public static create(
    id: IdentityTokenId, 
    industrialCode: IndustrialCode, 
    statusValue: IdentityStatusValue,
    batchId: string
  ): IdentityToken {
    return new IdentityToken(id, industrialCode, IdentityStatus.create(statusValue), batchId);
  }

  public get status(): IdentityStatus {
    return this._status;
  }

  /**
   * Intenta cancelar el token y encola el evento de dominio.
   */
  public cancel(
    permissions: PermissionSet, 
    reason: string, 
    clock: ClockPort, 
    uuidGenerator: UuidGeneratorPort
  ): void {
    if (!CancellationPolicy.canCancel(permissions, this)) {
      throw new Error("Privilegios insuficientes para cancelar el token.");
    }

    if (this._status.value === 'CANCELLED') {
      throw new IdentityAlreadyCancelledError(this.id as string);
    }

    this._status = this._status.transitionTo('CANCELLED');

    // Registrar Evento
    this.addDomainEvent(
      new IdentityCancelled(
        uuidGenerator.generate(),
        this.id as string,
        clock.now(),
        this.id,
        reason,
        permissions.userId
      )
    );
  }

  public assign(): void {
    if (this._status.value === 'ASSIGNED' || this._status.value === 'USED') {
      throw new TokenAlreadyAssignedError(this.id as string);
    }
    this._status = this._status.transitionTo('ASSIGNED');
  }
}
