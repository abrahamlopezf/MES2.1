/**
 * Puerto de abstracción para el Tiempo.
 * Evita el uso directo de `new Date()` en el dominio para facilitar los tests.
 */
export interface ClockPort {
  now(): Date;
}

/**
 * Puerto de abstracción para la generación de UUIDs.
 * Evita acoplar el dominio a bibliotecas externas o crypto local.
 */
export interface UuidGeneratorPort {
  generate(): string;
}

/**
 * Puerto para la publicación de Eventos de Dominio.
 */
export interface DomainEventBus {
  publish(event: any): Promise<void>;
  publishAll(events: any[]): Promise<void>;
}
