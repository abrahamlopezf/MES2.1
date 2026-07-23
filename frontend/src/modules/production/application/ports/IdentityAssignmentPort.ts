export interface IdentityAssignmentPort {
  /**
   * Solicita al Identity Center que asigne una identidad (IdentityTokenId) 
   * para un output de producción específico.
   * Esto se puede implementar de forma sincrónica o asincrónica (ej. Event Bus).
   */
  assignIdentity(productionRunId: string, outputDefinitionId: string): Promise<string | void>;
}
