import { IdentityGenerated } from '../events/IdentityDomainEvents';
import { Logger } from '@core/logging/Logger';

/**
 * Event Handler Perteneciente al Bounded Context de Trazabilidad / Auditoría.
 * Escucha cuando un Batch es generado y lo registra en el Ledger.
 */
export class AuditIdentityGenerationHandler {
  public async handle(event: IdentityGenerated): Promise<void> {
    Logger.audit(`[Audit] Se generó el lote ${event.batchId} con ${event.tokens.length} identidades.`, {
      eventId: event.eventId,
      aggregateId: event.aggregateId,
      actor: event.generatedBy,
      timestamp: event.occurredAt
    });

    // En un futuro: save to AuditLedger database...
  }
}
