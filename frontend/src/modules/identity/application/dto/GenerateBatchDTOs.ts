/**
 * Request DTO (Entrada desde la UI)
 * Solo tipos primitivos, nada de dominio.
 */
export interface GenerateBatchRequestDTO {
  plantId: string;
  areaId: string;
  tokenType: string;
  amount: number;
  requestedBy: string;
}

/**
 * Response DTO (Salida hacia la UI)
 * Información plana y procesada, lista para renderizar.
 */
export interface GenerateBatchResponseDTO {
  batchNumber: string;
  generatedAmount: number;
  message: string;
}

export interface BatchSnapshotDTO {
  id: string;
  batchNumber: string;
  plantId: string;
  areaId: string;
  tokenType: string;
  generatedAmount: number;
  generatedAt: string;
}

export interface BatchDetailsDTO extends BatchSnapshotDTO {
  tokens: {
    tokenId: string;
    industrialCode: string;
    status: string;
  }[];
}
