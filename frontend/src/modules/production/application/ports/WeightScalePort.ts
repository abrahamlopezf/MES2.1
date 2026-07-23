import { WeightMeasurement } from '../domain/valueObjects/TransformationValueObjects';

export interface WeightScalePort {
  /**
   * Captura el peso actual de la báscula configurada.
   */
  captureWeight(): Promise<WeightMeasurement>;
}
