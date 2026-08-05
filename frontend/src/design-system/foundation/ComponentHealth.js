import { tokens } from './tokens';

/**
 * Módulo de validación de salud para componentes del Design System.
 * Garantiza que el entorno cumpla con las políticas antes de renderizar.
 */
export const ComponentHealth = {
  /**
   * Verifica la configuración de un componente Core
   * @param {string} componentName 
   */
  check(componentName) {
    if (!tokens || !tokens.semantic) {
      throw new Error(`[MES_COMPONENT_INVALID_CONFIGURATION] El componente ${componentName} no puede acceder a los Design Tokens.`);
    }
    
    // Aquí se podrían agregar validaciones de contexto globales (Theme, Runtime, etc.)
    // Si algo crítico falla, lanzar un error claro.
    return true;
  }
};
