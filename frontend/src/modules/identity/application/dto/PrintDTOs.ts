export interface CreatePrintJobRequestDTO {
  batchId: string;
  templateId: string;
  idempotencyKey: string;
  requestedBy: string;
}

export interface PrintJobResponseDTO {
  jobId: string;
  status: string;
  message: string;
}
