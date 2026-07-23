import { GenerateBatchRequestDTO, GenerateBatchResponseDTO } from '../dto/GenerateBatchDTOs';
import { GenerateBatchCommand } from '../commands/GenerateBatchCommand';
import { GenerateBatchResult } from '../handlers/GenerateBatchHandler';
import { PlantId, AreaId, UserId } from '@shared/ids/brandTypes';
import { TokenTypeValue } from '../../domain/valueObjects/IdentityValueObjects';

export class GenerateBatchCommandMapper {
  public static toCommand(dto: GenerateBatchRequestDTO): GenerateBatchCommand {
    return new GenerateBatchCommand(
      dto.plantId as PlantId,
      dto.areaId as AreaId,
      dto.tokenType as TokenTypeValue,
      dto.amount,
      dto.requestedBy as UserId
    );
  }
}

export class GenerateBatchResponseMapper {
  public static toDTO(result: GenerateBatchResult): GenerateBatchResponseDTO {
    return {
      batchId: result.batchId,
      batchNumber: result.batchNumber,
      generatedAmount: result.generatedCount,
      message: `Lote ${result.batchNumber} generado con éxito (${result.generatedCount} tokens).`
    };
  }
}
