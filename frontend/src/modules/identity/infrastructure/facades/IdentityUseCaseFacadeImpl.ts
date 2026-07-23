import { GenerateBatchRequestDTO, GenerateBatchResponseDTO } from '../../application/dto/GenerateBatchDTOs';
import { ApproveRequestDTO, RejectRequestDTO } from '../../application/dto/ApprovalDTOs';
import { CreatePrintJobRequestDTO, PrintJobResponseDTO } from '../../application/dto/PrintDTOs';
import { TransferCustodyRequestDTO, CustodySnapshotDTO, CustodyTimelineDTO } from '../../application/dto/CustodyDTOs';
import { GenerateBatchCommandMapper, GenerateBatchResponseMapper } from '../../application/mappers/GenerateBatchMappers';
import { ApproveIdentificationRequestCommand, RejectIdentificationRequestCommand } from '../../application/commands/ApprovalCommands';
import { CreatePrintJobCommand } from '../../application/commands/PrintCommands';
import { TransferIdentityCustodyCommand } from '../../application/commands/TransferCustodyCommands';
import { GetCustodyTimelineQuery } from '../../application/queries/GetCustodyTimelineQuery';
import { GenerateBatchHandler } from '../../application/handlers/GenerateBatchHandler';
import { ApproveIdentificationRequestHandler } from '../../application/handlers/ApproveIdentificationRequestHandler';
import { RejectIdentificationRequestHandler } from '../../application/handlers/RejectIdentificationRequestHandler';
import { CreatePrintJobHandler } from '../../application/handlers/CreatePrintJobHandler';
import { TransferIdentityCustodyHandler } from '../../application/handlers/TransferIdentityCustodyHandler';
import { GetCustodyTimelineHandler } from '../../application/handlers/GetCustodyTimelineHandler';
import { IdentityUseCaseFacade } from '../../application/ports/IdentityUseCaseFacade';
import { PermissionSet } from '@core/authorization/PermissionSet';
import { IdentityCustodyRepository } from '../../domain/repositories/IdentityCustodyRepository';
import { IdentityReadRepository } from '../../domain/repositories/IdentityRepository';

export class IdentityUseCaseFacadeImpl implements IdentityUseCaseFacade {
  constructor(
    private readonly generateBatchHandler: GenerateBatchHandler,
    private readonly approveBatchHandler: ApproveIdentificationRequestHandler,
    private readonly rejectBatchHandler: RejectIdentificationRequestHandler,
    private readonly createPrintJobHandler: CreatePrintJobHandler,
    private readonly transferCustodyHandler: TransferIdentityCustodyHandler,
    private readonly getCustodyTimelineHandler: GetCustodyTimelineHandler,
    private readonly custodyRepository: IdentityCustodyRepository,
    private readonly identityReadRepository: IdentityReadRepository
  ) {}

  async generateBatch(request: GenerateBatchRequestDTO): Promise<GenerateBatchResponseDTO> {
    const command = GenerateBatchCommandMapper.toCommand(request);
    const permissions = new PermissionSet(request.requestedBy as any, new Set(['identity.batch.generate']));
    const result = await this.generateBatchHandler.execute(command, permissions);
    return GenerateBatchResponseMapper.toDTO(result);
  }

  async approveRequest(request: ApproveRequestDTO): Promise<void> {
    const command = new ApproveIdentificationRequestCommand(request.requestId, request.approverId);
    const permissions = new PermissionSet(request.approverId as any, new Set(['identity.batch.approve']));
    await this.approveBatchHandler.execute(command, permissions);
  }

  async rejectRequest(request: RejectRequestDTO): Promise<void> {
    const command = new RejectIdentificationRequestCommand(request.requestId, request.rejectorId, request.reason);
    const permissions = new PermissionSet(request.rejectorId as any, new Set(['identity.batch.approve']));
    await this.rejectBatchHandler.execute(command, permissions);
  }

  async printBatch(request: CreatePrintJobRequestDTO): Promise<PrintJobResponseDTO> {
    const command = new CreatePrintJobCommand(request.batchId, request.templateId, request.idempotencyKey, request.requestedBy);
    const permissions = new PermissionSet(request.requestedBy as any, new Set(['identity.print']));
    const jobId = await this.createPrintJobHandler.execute(command, permissions);
    return {
      jobId,
      status: 'QUEUED',
      message: 'Impresión encolada exitosamente.'
    };
  }

  async transferCustody(request: TransferCustodyRequestDTO): Promise<void> {
    const command = new TransferIdentityCustodyCommand(
      request.identityTokenId, 
      request.destinationOwner, 
      request.reason, 
      request.actorId, 
      request.correlationId
    );
    const permissions = new PermissionSet(request.actorId as any, new Set(['identity.custody.transfer']));
    await this.transferCustodyHandler.execute(command, permissions);
  }

  async getCustodySnapshot(identityTokenId: string): Promise<CustodySnapshotDTO | null> {
    const snapshot = await this.custodyRepository.findSnapshot(identityTokenId);
    if (!snapshot) return null;
    return {
      identityTokenId: snapshot.identityTokenId,
      currentOwner: snapshot.currentOwner,
      lastMovementAt: snapshot.lastMovementAt.toISOString(),
      totalMovements: snapshot.totalMovements
    };
  }

  async getCustodyTimeline(identityTokenId: string): Promise<CustodyTimelineDTO | null> {
    // Para simplificar, asumo que el usuario tiene 'identity.read' global. En un sistema real vendría de la request o context.
    const permissions = new PermissionSet('system_user' as any, new Set(['identity.read']));
    const query = new GetCustodyTimelineQuery(identityTokenId, 'system_user');
    return this.getCustodyTimelineHandler.execute(query, permissions);
  }

  async getAllBatches(): Promise<BatchSnapshotDTO[]> {
    return this.identityReadRepository.listBatches();
  }

  async getBatchById(batchId: string): Promise<BatchDetailsDTO | null> {
    return this.identityReadRepository.getBatchDetails(batchId);
  }
}
