import { WeightScalePort } from '../../application/ports/WeightScalePort';
import { WeightMeasurement } from '../../domain/valueObjects/TransformationValueObjects';

export class ManualWeightAdapter implements WeightScalePort {
  private currentSimulatedWeight: number = 0;

  public setSimulatedWeight(weight: number) {
    this.currentSimulatedWeight = weight;
  }

  async captureWeight(): Promise<WeightMeasurement> {
    return new WeightMeasurement(
      this.currentSimulatedWeight,
      'KG',
      new Date(),
      'MANUAL',
      1.0 // 100% de confianza al ser manual
    );
  }
}
