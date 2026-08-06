import { EventBus } from '../../core/platform/EventBus/EventBus';
import { MES_EVENTS } from '../../core/platform/EventBus/DomainEvents';

/**
 * ReceptionWorkflow (FSM)
 * Máquina de estados estricta. Cero dependencias de React.
 * Controla la evolución del proceso de Recepción y emite eventos globales.
 */
export const ReceptionWorkflow = {
  id: 'RECEPTION_WF',
  initialState: 'INITIAL',
  states: {
    INITIAL: {
      on: { QR_SCANNED: 'QR_RESOLVED', START_MANUAL: 'WAITING_INPUT' },
      onEnter: () => EventBus.emit(MES_EVENTS.WORKSPACE_OPENED, { workflow: 'RECEPTION_WF' })
    },
    QR_RESOLVED: {
      on: { VALIDATE_OK: 'FORM_READY', INVALID: 'ERROR' },
      onEnter: (payload) => {
        // En una app real esto despacharía un comando al Backend o Domain Service
        // para recuperar la info del material
        EventBus.emit('RECEPTION_QR_RESOLVED', payload);
      }
    },
    WAITING_INPUT: {
      on: { VALIDATE_OK: 'FORM_READY', CANCEL: 'INITIAL' }
    },
    FORM_READY: {
      on: { SUBMIT: 'SUBMITTING', CANCEL: 'INITIAL' }
    },
    VALIDATING: {
      on: { SUCCESS: 'SUBMITTING', FAILURE: 'FORM_READY' }
    },
    SUBMITTING: {
      on: { DONE: 'SUCCESS', FAIL: 'ERROR' }
    },
    SUCCESS: {
      on: { RESTART: 'INITIAL', FINISH: 'FINISHED' },
      onEnter: () => EventBus.emit(MES_EVENTS.WORKFLOW_COMPLETED, { workflow: 'RECEPTION_WF' })
    },
    ERROR: {
      on: { RESTART: 'INITIAL', CANCEL: 'FINISHED' }
    },
    FINISHED: {
      onEnter: () => EventBus.emit(MES_EVENTS.WORKSPACE_CLOSED, { workflow: 'RECEPTION_WF' })
    }
  }
};
