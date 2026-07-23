import { IdentityCommandRepository, IdentityReadRepository } from '../../domain/repositories/IdentityRepository';
import { IdentityBatch } from '../../domain/entities/IdentityBatch';
import { IdentityToken } from '../../domain/entities/IdentityToken';
import { IdentificationRequest } from '../../domain/entities/IdentificationRequest';
import { IdentityTokenId, QrBatchId } from '@shared/ids/brandTypes';

/**
 * Adapter HTTP/Fake para Pruebas.
 * Almacena en memoria simulando latencia.
 */
export class InMemoryIdentityRepository implements IdentityCommandRepository, IdentityReadRepository {
  private batches: Map<string, IdentityBatch> = new Map();
  private tokens: Map<string, IdentityToken> = new Map();
  private requests: Map<string, IdentificationRequest> = new Map();

  // ----- COMMAND REPOSITORY -----
  
  async findBatch(batchId: QrBatchId): Promise<IdentityBatch | null> {
    return this.batches.get(batchId as string) || null;
  }
  
  async findToken(tokenId: IdentityTokenId): Promise<IdentityToken | null> {
    return this.tokens.get(tokenId as string) || null;
  }
  
  async findRequest(requestId: string): Promise<IdentificationRequest | null> {
    return this.requests.get(requestId) || null;
  }

  async saveBatch(batch: IdentityBatch): Promise<void> {
    this.batches.set(batch.id as string, batch);
    // Para simplificar la demo, guardamos los tokens directamente aquí
    batch.tokens.forEach(t => this.saveToken(t));
    await this.delay(300);
  }
  
  async saveToken(token: IdentityToken): Promise<void> {
    this.tokens.set(token.id as string, token);
  }
  
  async saveRequest(request: IdentificationRequest): Promise<void> {
    this.requests.set(request.id, request);
    await this.delay(300);
  }

  // ----- READ REPOSITORY -----

  async listPendingRequests(): Promise<any[]> {
    return Array.from(this.requests.values())
      .filter(r => r.status === 'PENDING')
      .map(r => ({ id: r.id, status: r.status })); // DTO plano
  }
  
  async getDashboardStats(): Promise<any> {
    return {
      totalBatches: this.batches.size,
      totalTokens: this.tokens.size
    };
  }

  async listBatches(): Promise<any[]> {
    return Array.from(this.batches.values())
      .map(b => ({
        id: b.id as string,
        batchNumber: b.batchNumber.value,
        plantId: b.plantId,
        areaId: b.areaId,
        tokenType: b.tokenType.value,
        generatedAmount: b.tokenCount,
        generatedAt: b.generatedAt.toISOString()
      }))
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
  }

  async getBatchDetails(batchId: string): Promise<any | null> {
    const batch = this.batches.get(batchId);
    if (!batch) return null;
    
    return {
      id: batch.id as string,
      batchNumber: batch.batchNumber.value,
      plantId: batch.plantId,
      areaId: batch.areaId,
      tokenType: batch.tokenType.value,
      generatedAmount: batch.tokenCount,
      generatedAt: batch.generatedAt.toISOString(),
      tokens: batch.tokens.map(t => ({
        tokenId: t.id as string,
        industrialCode: t.industrialCode.value,
        status: t.status.value
      }))
    };
  }
  
  async searchTokens(query: string): Promise<any[]> {
    return Array.from(this.tokens.values())
      .filter(t => t.industrialCode.value.includes(query))
      .map(t => ({ id: t.id, code: t.industrialCode.value, status: t.status.value }));
  }

  // Utilidad
  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
