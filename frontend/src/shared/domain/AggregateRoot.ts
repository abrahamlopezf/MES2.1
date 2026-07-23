import { DomainEvent } from './events/DomainEvent';

/**
 * Clase base para todos los Aggregate Roots del sistema.
 * Encapsula la lógica de recolección y emisión de eventos de dominio sin afectar la infraestructura.
 */
export abstract class AggregateRoot<TId> {
  protected readonly events: DomainEvent[] = [];

  /**
   * Identificador único del Aggregate Root.
   */
  abstract get id(): TId;

  /**
   * Añade un evento a la cola interna del agregado.
   */
  protected addDomainEvent(event: DomainEvent): void {
    this.events.push(event);
  }

  /**
   * Extrae los eventos encolados y los limpia.
   * Utilizado por el Application Layer (Handlers) para publicarlos después de persistir el estado.
   */
  public pullEvents(): DomainEvent[] {
    const pulledEvents = [...this.events];
    this.events.length = 0; // limpia el arreglo sin perder la referencia
    return pulledEvents;
  }

  /**
   * Borra los eventos sin extraerlos.
   */
  public clearEvents(): void {
    this.events.length = 0;
  }
}
