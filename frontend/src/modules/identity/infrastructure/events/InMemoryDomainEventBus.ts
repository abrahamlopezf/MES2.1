import { DomainEventBus } from '@shared/domain/ports/DomainPorts';
import { DomainEvent } from '@shared/domain/events/DomainEvent';
import { Logger } from '@core/logging/Logger';

type EventHandler = (event: DomainEvent) => void | Promise<void>;

/**
 * Adaptador de Event Bus en Memoria para Vertical Slices tempranos.
 */
export class InMemoryDomainEventBus implements DomainEventBus {
  private handlers: Map<string, EventHandler[]> = new Map();

  /**
   * Registra un Event Handler (Ej. NotificationService para 'IdentityBatchGenerated')
   */
  public subscribe(eventName: string, handler: EventHandler): void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, []);
    }
    this.handlers.get(eventName)!.push(handler);
  }

  public async publish(event: DomainEvent): Promise<void> {
    Logger.audit(`[DomainEventBus] Publicando evento: ${event.eventName}`, { event });
    
    const eventHandlers = this.handlers.get(event.eventName) || [];
    
    // Ejecutamos todos los handlers registrados en paralelo
    const promises = eventHandlers.map(handler => {
      try {
        return Promise.resolve(handler(event));
      } catch (error) {
        Logger.error(`Error en handler de ${event.eventName}`, { error, event });
        return Promise.resolve();
      }
    });

    await Promise.allSettled(promises);
  }

  public async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }
}
