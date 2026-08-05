/**
 * Capability Registry
 * 
 * Este es el único punto de entrada para registrar nuevos módulos en el MES.
 * Ningún módulo (Reception, Extrusion, etc.) puede existir visualmente si no ha 
 * registrado sus capacidades (workflow, workspace, permissions) aquí.
 */

class CapabilityRegistryService {
  constructor() {
    this.capabilities = new Map();
  }

  /**
   * Registra una nueva capacidad en el sistema
   * @param {Object} capabilityDefinition
   * @param {string} capabilityDefinition.purpose - Ej: 'RECEPTION'
   * @param {Object} capabilityDefinition.workflow - Máquina de estados declarativa del workflow
   * @param {React.Component} capabilityDefinition.workspace - Componente UI (Workspace)
   * @param {Array} capabilityDefinition.permissions - Permisos necesarios
   */
  register(capabilityDefinition) {
    const { purpose, workflow, workspace, permissions = [] } = capabilityDefinition;
    
    if (!purpose || !workflow || !workspace) {
      throw new Error(`Fallo al registrar capacidad. Faltan propiedades obligatorias para el purpose: ${purpose || 'DESCONOCIDO'}`);
    }

    if (this.capabilities.has(purpose)) {
      console.warn(`[CapabilityRegistry] Sobrescribiendo la capacidad existente para: ${purpose}`);
    }

    this.capabilities.set(purpose, capabilityDefinition);
    console.log(`[CapabilityRegistry] Capacidad registrada: ${purpose}`);
  }

  /**
   * Obtiene la definición de una capacidad por su propósito
   * @param {string} purpose 
   * @returns {Object} La capacidad registrada
   */
  getCapability(purpose) {
    const capability = this.capabilities.get(purpose);
    if (!capability) {
      throw new Error(`[CapabilityRegistry] No se encontró ninguna capacidad registrada para el propósito: ${purpose}`);
    }
    return capability;
  }

  /**
   * Retorna todas las capacidades registradas (útil para el Operations Center o debugging)
   * @returns {Array} Array de capacidades
   */
  getAllCapabilities() {
    return Array.from(this.capabilities.values());
  }
}

// Exportamos un singleton
export const CapabilityRegistry = new CapabilityRegistryService();
