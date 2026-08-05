import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CapabilityRegistry } from '../../../core/platform/CapabilityRegistry/CapabilityRegistry';
import { EventBus } from '../../../core/platform/EventBus/EventBus';
import { createWorkflow } from '../../../core/runtime/WorkflowEngine/createWorkflow';
import { MES_EVENTS } from '../../../core/platform/EventBus/DomainEvents';

/**
 * Pruebas de Integración del Runtime Completo
 * Valida que los componentes del núcleo cooperen sin fallas.
 */
describe('Runtime Integration', () => {
  beforeEach(() => {
    CapabilityRegistry.registry.clear();
    EventBus.listeners.clear();
  });

  it('debe registrar un Capability, ejecutar su Workflow y emitir eventos de completitud', () => {
    // 1. Crear un Workflow
    const workflow = createWorkflow({
      id: 'INTEGRATION_WF',
      initialState: 'INITIAL',
      states: {
        INITIAL: { on: { START: 'RUNNING' } },
        RUNNING: { on: { COMPLETE: 'SUCCESS' } },
        SUCCESS: { 
          onEnter: () => EventBus.emit(MES_EVENTS.WORKFLOW_COMPLETED, { id: 'INTEGRATION_WF' }) 
        }
      }
    });

    // 2. Registrar el Capability
    CapabilityRegistry.register({
      purpose: 'INTEGRATION_TEST',
      workflow: 'INTEGRATION_WF',
      permissions: [],
      workspace: () => null
    });

    const capability = CapabilityRegistry.resolve('INTEGRATION_TEST');
    expect(capability).toBeDefined();

    // 3. Suscribirse al EventBus
    const completionSpy = vi.fn();
    EventBus.on(MES_EVENTS.WORKFLOW_COMPLETED, completionSpy);

    // 4. Ejecutar el Workflow
    workflow.dispatch('START');
    expect(workflow.getState()).toBe('RUNNING');
    
    workflow.dispatch('COMPLETE');
    expect(workflow.getState()).toBe('SUCCESS');

    // 5. Validar que la integración funcionó emitiendo el evento global
    expect(completionSpy).toHaveBeenCalledTimes(1);
    expect(completionSpy).toHaveBeenCalledWith({ id: 'INTEGRATION_WF' });
  });
});
