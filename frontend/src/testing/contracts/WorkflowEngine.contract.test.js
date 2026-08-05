import { describe, it, expect } from 'vitest';
import { createWorkflow } from '../../../core/runtime/WorkflowEngine/createWorkflow';

describe('WorkflowEngine (Contract)', () => {
  it('createWorkflow debe retornar un objeto con getState, dispatch, subscribe', () => {
    const wf = createWorkflow({
      id: 'DUMMY',
      initialState: 'IDLE',
      states: { IDLE: {} }
    });

    expect(typeof wf.getState).toBe('function');
    expect(typeof wf.dispatch).toBe('function');
    expect(typeof wf.subscribe).toBe('function');
  });

  it('el callback de subscribe debe retornar un unsubscribe', () => {
    const wf = createWorkflow({
      id: 'DUMMY',
      initialState: 'IDLE',
      states: { IDLE: {} }
    });

    const unsubscribe = wf.subscribe(() => {});
    expect(typeof unsubscribe).toBe('function');
  });
});
