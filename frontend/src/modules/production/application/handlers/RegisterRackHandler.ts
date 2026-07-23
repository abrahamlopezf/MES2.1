import { Rack } from '../../domain/entities/Rack';
import { ProductionRepository } from '../../application/ports/ProductionRepository';

export class RegisterRackHandler {
  constructor(private readonly repository: ProductionRepository) {}

  async execute(rackId: string, ptiMaterialId: string, operatorId: string): Promise<void> {
    const existing = await this.repository.getRack(rackId);
    if (existing) throw new Error('Rack already registered');

    const rack = new Rack(rackId, ptiMaterialId, 'OPEN', new Date(), operatorId);
    await this.repository.saveRack(rack);
  }
}
