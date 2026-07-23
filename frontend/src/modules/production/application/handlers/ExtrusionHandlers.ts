import { DomainEventBusPort, UuidGeneratorPort, ClockPort } from '../../../../shared/domain/ports/DomainPorts';
import { ProcessContext } from '../../engine/ProcessContext';
import { ExtrusionTransformation } from '../../domain/entities/ExtrusionTransformation';
import { Rack } from '../../domain/entities/Rack';
import { ProductionRepository } from '../../application/ports/ProductionRepository';

export class ExtrusionHandlers {
  constructor(
    private readonly repository: ProductionRepository,
    private readonly eventBus: DomainEventBusPort,
    private readonly uuidGenerator: UuidGeneratorPort,
    private readonly clock: ClockPort
  ) {}

  async startExtrusion(
    recipeId: string,
    stationId: string,
    operatorId: string,
    consumedMixBatchQR: string
  ): Promise<string> {
    const transformationId = this.uuidGenerator.generate();
    const now = this.clock.now();

    const context = new ProcessContext(
      'PLANT-01',
      'AREA-PROD-01',
      stationId,
      'MACHINE-MOCK-02', 
      operatorId,
      'TURNO-1',
      recipeId,
      now
    );

    const extrusion = ExtrusionTransformation.start(
      transformationId,
      recipeId,
      context,
      consumedMixBatchQR,
      100, // mock quantity 100KG from the mix
      'KG'
    );

    await this.repository.saveExtrusionTransformation(extrusion);

    for (const event of extrusion.pullDomainEvents()) {
      await this.eventBus.publish(event);
    }

    return transformationId;
  }

  async registerRollToRack(
    extrusionId: string,
    rackId: string,
    rollQR: string,
    operatorId: string,
    quantity: number,
    unit: string
  ): Promise<void> {
    const extrusion = await this.repository.getExtrusionTransformation(extrusionId);
    if (!extrusion) throw new Error('Extrusion not found');

    const rack = await this.repository.getRack(rackId);
    if (!rack) throw new Error('Rack not found');

    const now = this.clock.now();

    // 1. Add to rack
    rack.addRoll(rollQR, quantity, unit as any, operatorId, extrusionId);
    
    // 2. Add as partial output to Extrusion
    extrusion.registerPartialOutput(rollQR, quantity, unit, operatorId, now);

    await this.repository.saveRack(rack);
    await this.repository.saveExtrusionTransformation(extrusion);

    for (const event of rack.pullDomainEvents()) {
      await this.eventBus.publish(event);
    }
  }
}
