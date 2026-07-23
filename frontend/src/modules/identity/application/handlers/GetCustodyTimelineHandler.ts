import { GetCustodyTimelineQuery } from '../queries/GetCustodyTimelineQuery';
import { CustodyTimelineDTO } from '../dto/CustodyDTOs';
import { IdentityCustodyRepository } from '../../domain/repositories/IdentityCustodyRepository';
import { CustodyTimelineMapper } from '../mappers/CustodyTimelineMapper';
import { PermissionSet } from '@core/authorization/PermissionSet';

export class GetCustodyTimelineHandler {
  constructor(private readonly custodyRepository: IdentityCustodyRepository) {}

  public async execute(
    query: GetCustodyTimelineQuery,
    permissions: PermissionSet
  ): Promise<CustodyTimelineDTO | null> {
    // 1. Autorización (Requiere permiso de lectura)
    permissions.require('identity.read');

    // 2. Recuperar el Ledger
    const ledger = await this.custodyRepository.findLedger(query.identityTokenId);

    if (!ledger) {
      return null;
    }

    // 3. Mapear al DTO con la inversión cronológica para UI
    return CustodyTimelineMapper.toDTO(ledger);
  }
}
