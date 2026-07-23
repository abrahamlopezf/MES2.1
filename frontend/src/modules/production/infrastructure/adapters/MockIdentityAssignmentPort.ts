import { IdentityAssignmentPort } from '../../application/ports/IdentityAssignmentPort';

export class MockIdentityAssignmentPort implements IdentityAssignmentPort {
  async assignIdentity(productionRunId: string, outputDefinitionId: string): Promise<string> {
    console.log(`[IdentityAssignmentPort] Solicitando identidad para Run: ${productionRunId}, Output: ${outputDefinitionId}`);
    // Simulamos la generación asíncrona de un token
    return `WIP-${outputDefinitionId.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 10000)}`;
  }
}
