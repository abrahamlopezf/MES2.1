import { EventBus } from '../../core/platform/EventBus/EventBus';
import { MES_EVENTS } from '../../core/platform/EventBus/DomainEvents';

/**
 * Reception Commands
 * Encapsulan la intención operativa. El Workspace despacha estos comandos,
 * el Runtime decide quién y cómo se ejecutan (API, Offline Queue, Mock).
 */
export class ResolveQrCommand {
  constructor(qrCode) {
    this.type = 'RESOLVE_QR_COMMAND';
    this.payload = { qrCode };
  }

  execute() {
    // Ejemplo de ejecución mediante EventBus, 
    // en una app completa un DomainService escucharía esto.
    EventBus.emit('COMMAND_DISPATCHED', { command: this.type, payload: this.payload });
    
    // Simulación de resolución exitosa para continuar el Workflow
    setTimeout(() => {
      EventBus.emit(MES_EVENTS.QR_RESOLVED, { qrCode: this.payload.qrCode, status: 'VALID' });
    }, 200);
  }
}

export class SubmitReceptionCommand {
  constructor(materialId, quantity, rack, notes) {
    this.type = 'SUBMIT_RECEPTION_COMMAND';
    this.payload = { materialId, quantity, rack, notes };
  }

  execute() {
    EventBus.emit('COMMAND_DISPATCHED', { command: this.type, payload: this.payload });
    // Aquí el Runtime rutearía la petición al API de inventario.
  }
}
