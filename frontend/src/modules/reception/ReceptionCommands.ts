import { EventBus } from '../../core/platform/EventBus/EventBus';
import { MES_EVENTS } from '../../core/platform/EventBus/DomainEvents';

export class ResolveQrCommand {
  type = 'RESOLVE_QR_COMMAND';
  payload: { qrCode: string };

  constructor(qrCode: string) {
    this.payload = { qrCode };
  }

  execute() {
    EventBus.emit('COMMAND_DISPATCHED', { command: this.type, payload: this.payload });
    setTimeout(() => {
      EventBus.emit(MES_EVENTS.QR_RESOLVED, { qrCode: this.payload.qrCode, status: 'VALID' });
    }, 200);
  }
}

export interface SubmitReceptionRequest {
  qrCode: string;
  materialId: number;
  quantity: number;
  rack?: string;
  observations?: string;
}

export class SubmitReceptionCommand {
  type = 'SUBMIT_RECEPTION_COMMAND';
  payload: SubmitReceptionRequest;

  constructor(request: SubmitReceptionRequest) {
    this.payload = request;
  }

  execute() {
    EventBus.emit('COMMAND_DISPATCHED', { command: this.type, payload: this.payload });
  }
}
