export interface ApproveRequestDTO {
  requestId: string;
  approverId: string;
}

export interface RejectRequestDTO {
  requestId: string;
  rejectorId: string;
  reason: string;
}
