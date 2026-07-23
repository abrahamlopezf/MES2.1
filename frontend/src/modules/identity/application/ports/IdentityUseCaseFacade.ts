import { GenerateBatchRequestDTO, GenerateBatchResponseDTO, BatchSnapshotDTO, BatchDetailsDTO } from '../dto/GenerateBatchDTOs';
import { ApproveRequestDTO, RejectRequestDTO } from '../dto/ApprovalDTOs';
import { CreatePrintJobRequestDTO, PrintJobResponseDTO } from '../dto/PrintDTOs';
import { TransferCustodyRequestDTO, CustodySnapshotDTO, CustodyTimelineDTO } from '../dto/CustodyDTOs';

export interface IdentityUseCaseFacade {
  generateBatch(request: GenerateBatchRequestDTO): Promise<GenerateBatchResponseDTO>;
  approveRequest(request: ApproveRequestDTO): Promise<void>;
  rejectRequest(request: RejectRequestDTO): Promise<void>;
  printBatch(request: CreatePrintJobRequestDTO): Promise<PrintJobResponseDTO>;
  transferCustody(request: TransferCustodyRequestDTO): Promise<void>;
  getCustodySnapshot(identityTokenId: string): Promise<CustodySnapshotDTO | null>;
  getCustodyTimeline(identityTokenId: string): Promise<CustodyTimelineDTO | null>;
  getAllBatches(): Promise<BatchSnapshotDTO[]>;
  getBatchById(batchId: string): Promise<BatchDetailsDTO | null>;
}
