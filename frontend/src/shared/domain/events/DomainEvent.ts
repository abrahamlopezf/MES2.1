/**
 * Clase base para todos los Eventos de Dominio en el sistema.
 * Contiene metadatos fundamentales para Event Sourcing, Outbox o Trazabilidad (Sagas).
 */
export abstract class DomainEvent {
  constructor(
    public readonly eventId: string,
    public readonly aggregateId: string,
    public readonly aggregateType: string,
    public readonly eventName: string,
    public readonly occurredAt: Date,
    public readonly eventVersion: number = 1,
    public readonly correlationId?: string,
    public readonly causationId?: string
  ) {}
}
