/**
 * Workflow Engine
 * Motor declarativo para gestionar los estados de un flujo de trabajo.
 * Evita tener lógica de estado (if/switch) dispersa en los componentes React.
 */

export function createWorkflow(workflowDefinition) {
  // Manejar el caso donde se pasa la máquina completa { id, states, initialState } 
  // o solo el objeto states
  const def = workflowDefinition.states ? workflowDefinition : { states: workflowDefinition, initialState: 'INITIAL' };
  const states = Object.keys(def.states);
  
  if (!states.includes('INITIAL')) {
    throw new Error('Todo workflow debe tener al menos un estado INITIAL.');
  }

  let currentState = def.initialState || 'INITIAL';
  const listeners = new Set();

  const notify = () => {
    listeners.forEach(listener => listener(currentState));
  };

  return {
    states: states,
    definition: def.states,
    
    getInitialState: () => def.initialState || 'INITIAL',
    
    getStateDefinition: (state) => {
      if (!states.includes(state)) {
        throw new Error(`Estado desconocido: ${state}`);
      }
      return def.states[state];
    },

    // Métodos reales del FSM
    getState: () => currentState,

    subscribe: (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },

    dispatch: (action) => {
      const stateDef = def.states[currentState];
      if (!stateDef) return;

      const nextState = stateDef.on?.[action];
      if (nextState && states.includes(nextState)) {
        currentState = nextState;
        
        // Ejecutar hook onEnter si existe en el nuevo estado
        const nextStateDef = def.states[nextState];
        if (nextStateDef && typeof nextStateDef.onEnter === 'function') {
          // pasamos null payload por defecto o lo sacamos si quisiéramos
          nextStateDef.onEnter();
        }

        notify();
      } else {
        console.warn(`Transición inválida: '${action}' desde el estado '${currentState}'`);
      }
    }
  };
}
