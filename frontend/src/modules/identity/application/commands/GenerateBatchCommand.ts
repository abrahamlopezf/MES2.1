import { AreaId, PlantId, UserId } from '@shared/ids/brandTypes';
import { TokenTypeValue } from '../../domain/valueObjects/IdentityValueObjects';

/**
 * Command: GenerateBatch
 * Representa la intención pura del usuario.
 * Nota: No contiene detalles técnicos (como 'prefix' de código), solo negocio.
 */
export class GenerateBatchCommand {
  constructor(
    public readonly plantId: PlantId,
    public readonly areaId: AreaId,
    public readonly tokenType: TokenTypeValue,
    public readonly amount: number,
    public readonly requestedByUserId: UserId
  ) {}
}
