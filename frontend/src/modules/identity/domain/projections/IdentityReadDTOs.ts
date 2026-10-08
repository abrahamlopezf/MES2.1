export interface PendingRequestDTO {
  id: string;
  status: string;
}

export interface DashboardStatsDTO {
  totalBatches: number;
  totalTokens: number;
}

export interface IdentityTokenDTO {
  id: string;
  code: string;
  status: string;
  batchId?: string;
}

export interface IdentityBatchDTO {
  id: string;
  batchNumber: string;
  plantId: string;
  areaId: string;
  tokenType: string;
  generatedAmount: number;
  generatedAt: string;
}

export interface IdentityBatchDetailsDTO extends IdentityBatchDTO {
  tokens: {
    tokenId: string;
    industrialCode: string;
    status: string;
  }[];
}
