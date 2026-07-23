import { InvalidStatusTransitionError } from '../errors/IdentityDomainErrors';

export type IdentityStatusValue = 
  | 'AVAILABLE' 
  | 'ASSIGNED' 
  | 'USED' 
  | 'CANCELLED' 
  | 'DAMAGED' 
  | 'LOST';

/**
 * Máquina de estados para el IdentityStatus.
 * Centraliza las reglas de transición permitidas.
 */
export class IdentityStatus {
  private constructor(public readonly value: IdentityStatusValue) {}

  public static create(value: IdentityStatusValue): IdentityStatus {
    return new IdentityStatus(value);
  }

  public static available(): IdentityStatus {
    return new IdentityStatus('AVAILABLE');
  }

  /**
   * Verifica si es legal transicionar del estado actual al nuevo estado.
   */
  public canTransitionTo(nextStatus: IdentityStatusValue): boolean {
    if (this.value === nextStatus) return false;

    switch (this.value) {
      case 'AVAILABLE':
        return ['ASSIGNED', 'CANCELLED', 'DAMAGED', 'LOST'].includes(nextStatus);
      case 'ASSIGNED':
        return ['USED', 'CANCELLED', 'DAMAGED', 'LOST'].includes(nextStatus);
      case 'USED':
        // Un token usado no puede volver a estar disponible ni cancelarse.
        return ['DAMAGED', 'LOST'].includes(nextStatus);
      case 'CANCELLED':
      case 'DAMAGED':
      case 'LOST':
        // Estados terminales
        return false;
      default:
        return false;
    }
  }

  /**
   * Ejecuta la transición, lanzando error si es inválida.
   */
  public transitionTo(nextStatus: IdentityStatusValue): IdentityStatus {
    if (!this.canTransitionTo(nextStatus)) {
      throw new InvalidStatusTransitionError(this.value, nextStatus);
    }
    return new IdentityStatus(nextStatus);
  }

  public equals(other: IdentityStatus): boolean {
    return this.value === other.value;
  }
}
