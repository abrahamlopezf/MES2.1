const { TraceabilityEvent } = require('../../database/models');

class TraceabilityDomainService {
  /**
   * Crea un evento inmutable en la historia del QR.
   */
  async createEvent(payload, transaction = null) {
    const {
      qr_id,
      event_type,
      entity_type,
      entity_id,
      performed_by,
      notes = null,
      metadata = {}
    } = payload;

    if (!qr_id || !event_type || !performed_by) {
      throw new Error('qr_id, event_type, and performed_by are required to create a traceability event.');
    }

    const event = await TraceabilityEvent.create({
      qr_code_id: qr_id,
      event_type,
      entity_type,
      entity_id: entity_id ? String(entity_id) : null,
      performed_by,
      notes,
      metadata
    }, { transaction });

    return event;
  }
}

module.exports = new TraceabilityDomainService();
