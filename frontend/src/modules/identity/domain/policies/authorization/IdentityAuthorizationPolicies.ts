import { IdentityTokenId } from '@shared/ids/brandTypes';
import { IdentityToken } from './IdentityToken';

export type AppPermission = 
  | 'identity.batch.generate'
  | 'identity.batch.approve'
  | 'identity.print'
  | 'identity.custody.transfer';

/**
 * Representa las capacidades de un actor en el sistema.
 * El dominio de Identidad ya no necesita saber sobre roles JWT o base de datos de usuarios.
 */
export class PermissionSet {
  constructor(
    public readonly userId: any, // UserId brand type
    private readonly permissions: Set<AppPermission>
  ) {}

  public can(permission: AppPermission): boolean {
    return this.permissions.has(permission);
  }
}

export class CancellationPolicy {
  public static canCancel(permissions: PermissionSet, token: IdentityToken): boolean {
    // Solo validamos la capacidad, no el usuario específico
    return permissions.can('identity.batch.generate'); 
  }
}
