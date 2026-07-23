type EventCallback<T = any> = (payload: T) => void;

class EventBusService {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  /**
   * Suscribe a un evento de dominio.
   */
  public subscribe<T>(event: string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Retorna una función para desuscribirse
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  /**
   * Publica un evento de dominio al bus.
   */
  public publish<T>(event: string, payload: T): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(payload);
        } catch (error) {
          console.error(`Error procesando el evento ${event}:`, error);
        }
      });
    }
  }
}

// Instancia global (Singleton)
export const EventBus = new EventBusService();
