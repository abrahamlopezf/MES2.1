import { IdentityBatch } from '../entities/IdentityBatch';
import { IdentificationRequest } from '../entities/IdentificationRequest';
import { IdentityToken } from '../entities/IdentityToken';
import { QrBatchId, IdentityTokenId } from '@shared/ids/brandTypes';

/**
 * Repositorio de Comandos.
 * Solo contiene métodos para recuperar y guardar agregados que van a mutar (Write Model).
 */
export interface IdentityCommandRepository {
  findBatch(batchId: QrBatchId): Promise<IdentityBatch | null>;
  findToken(tokenId: IdentityTokenId): Promise<IdentityToken | null>;
  findRequest(requestId: string): Promise<IdentificationRequest | null>;
  
  saveBatch(batch: IdentityBatch): Promise<void>;
  saveToken(token: IdentityToken): Promise<void>;
  saveRequest(request: IdentificationRequest): Promise<void>;
}

/**
 * Repositorio de Consultas.
 * Solo contiene métodos optimizados para lectura (Read Model).
 * Devuelve DTOs planos, NO instancias de clases de dominio.
 */
export interface IdentityReadRepository {
  listPendingRequests(): Promise<any[]>; // TODO: Tipar DTO
  getDashboardStats(): Promise<any>; // TODO: Tipar DTO
  searchTokens(query: string): Promise<any[]>; // TODO: Tipar DTO
  listBatches(): Promise<any[]>;
  getBatchDetails(batchId: string): Promise<any | null>;
}
