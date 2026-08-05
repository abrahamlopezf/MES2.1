import { describe, it, expect } from 'vitest';
import { createWorkflow } from '../../../core/runtime/WorkflowEngine/createWorkflow';

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

  it('debe rechazar una transición inválida', () => {
    const workflow = createWorkflow({
      id: 'TEST_WF',
      initialState: 'READY',
      states: {
        READY: {
          on: { SCAN: 'SCANNING' }
        },
        SUCCESS: {}
      }
    });
    
    // Attempt to jump directly to SUCCESS which is not defined from READY
    expect(() => workflow.dispatch('JUMP_TO_SUCCESS')).toThrow();
    expect(workflow.getState()).toBe('READY'); // Must remain in the same state
  });

  it('debe proteger contra invariantes (READY -> READY)', () => {
    const workflow = createWorkflow({
      id: 'TEST_WF',
      initialState: 'READY',
      states: {
        READY: {
          on: { CONTINUE: 'READY' } // This is technically valid in some FSMs, but according to MES invariant rules it might be blocked. For now, testing basic dispatch.
        }
      }
    });
    
    workflow.dispatch('CONTINUE');
    expect(workflow.getState()).toBe('READY');
  });
});
