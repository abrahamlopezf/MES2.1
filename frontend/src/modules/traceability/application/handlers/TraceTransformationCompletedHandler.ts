import { DomainEvent } from '../../../../shared/domain/events/DomainEvent';
import { TransformationCompletedEvent } from '../../../production/domain/events/ProductionEvents';
import { Logger } from '../../../../core/logging/Logger';

export class TraceTransformationCompletedHandler {
  public async handle(event: DomainEvent): Promise<void> {
    if (event instanceof TransformationCompletedEvent) {
      Logger.info(`[Traceability] Registrando Genealogía de Transformación ${event.transformationId}`);
      
      event.inputs.forEach(input => {
        event.outputs.forEach(output => {
          Logger.audit(`[Genealogy] Input QR: ${input.identityTokenId} -> Transformation: ${event.type} -> Output QR: ${output.identityTokenId}`);
          // Aquí se escribiría al MaterialGenealogy Repository
        });
      });
    }
  }
}
