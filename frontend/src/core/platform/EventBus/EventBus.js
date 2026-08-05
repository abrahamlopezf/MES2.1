import { MES_EVENTS } from './DomainEvents';

/**
 * Event Bus (Pub/Sub)
 * Desacopla la comunicación entre módulos. 
 */
class EventBusService {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Suscribe una función a un evento
   * @param {string} eventName (Debe venir de MES_EVENTS)
   * @param {Function} callback 
   * @returns {Function} Función de desuscripción
   */
  subscribe(eventName, callback) {
    if (!Object.values(MES_EVENTS).includes(eventName)) {
      console.warn(`[EventBus] Suscribiéndose a un evento no registrado en MES_EVENTS: ${eventName}`);
    }

    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    
    this.listeners.get(eventName).add(callback);

    // Retorna función para desuscribir
    return () => {
      this.listeners.get(eventName).delete(callback);
    };
  }

  /**
   * Emite un evento a todos los suscriptores
   * @param {string} eventName (Debe venir de MES_EVENTS)
   * @param {any} payload 
   */
  emit(eventName, payload) {
    if (!Object.values(MES_EVENTS).includes(eventName)) {
      console.warn(`[EventBus] Emitiendo un evento no registrado en MES_EVENTS: ${eventName}`);
    }

    if (!this.listeners.has(eventName)) {
      return;
    }

    for (const callback of this.listeners.get(eventName)) {
      try {
        callback(payload);
      } catch (error) {
        console.error(`[EventBus] Error en listener de evento ${eventName}:`, error);
      }
    }
  }
}

export const EventBus = new EventBusService();
