/**
 * Workflow Engine
 * Motor declarativo para gestionar los estados de un flujo de trabajo.
 * Evita tener lógica de estado (if/switch) dispersa en los componentes React.
 */

export function createWorkflow(workflowDefinition) {
  const states = Object.keys(workflowDefinition);
  
  if (!states.includes('INITIAL')) {
    throw new Error('Todo workflow debe tener al menos un estado INITIAL.');
  }

  return {
    states: states,
    definition: workflowDefinition,
    
    // Función de utilidad para validar si una transición es permitida, 
    // ejecutar side-effects declarados en el estado, etc.
    // Esto se conectará más adelante con un custom hook useWorkflow.
    getInitialState: () => 'INITIAL',
    
    getStateDefinition: (state) => {
      if (!states.includes(state)) {
        throw new Error(`Estado desconocido: ${state}`);
      }
      return workflowDefinition[state];
    }
  };
}
