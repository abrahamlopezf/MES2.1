import { describe, it, expect, vi } from 'vitest';
import { createWorkflow } from '../../core/runtime/WorkflowEngine/createWorkflow';

describe('WorkflowEngine (Unit)', () => {
  it('debe iniciar en el estado configurado como inicial', () => {
    const workflow = createWorkflow({
      id: 'TEST_WF',
      initialState: 'INITIAL',
      states: {
        INITIAL: {}
      }
    });
    
    expect(workflow.getState()).toBe('INITIAL');
  });

  it('debe transicionar a un estado válido y disparar callbacks', () => {
    let entered = false;
    const workflow = createWorkflow({
      id: 'TEST_WF',
      initialState: 'INITIAL',
      states: {
        INITIAL: {
          on: { START: 'SCANNING' }
        },
        SCANNING: {
          onEnter: () => { entered = true; }
        }
      }
    });
    
    workflow.dispatch('START');
    expect(workflow.getState()).toBe('SCANNING');
    expect(entered).toBe(true);
  });

  it('debe ignorar una transición que no existe y conservar el estado', () => {
    const workflow = createWorkflow({
      id: 'TEST_WF',
      initialState: 'INITIAL',
      states: {
        INITIAL: {
          on: { SCAN: 'SCANNING' }
        },
        SCANNING: {}
      }
    });
    
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    workflow.dispatch('JUMP_TO_SUCCESS');
    expect(workflow.getState()).toBe('INITIAL');
    expect(warning).toHaveBeenCalled();
    warning.mockRestore();
  });

  it('debe permitir una transición al mismo estado si está configurada', () => {
    const workflow = createWorkflow({
      id: 'TEST_WF',
      initialState: 'INITIAL',
      states: {
        INITIAL: {
          on: { CONTINUE: 'INITIAL' }
        }
      }
    });
    
    workflow.dispatch('CONTINUE');
    expect(workflow.getState()).toBe('INITIAL');
  });
});
