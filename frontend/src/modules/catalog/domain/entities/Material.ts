import { UnitOfMeasure } from '../valueObjects/UnitOfMeasure';
import { MaterialCategory } from './MaterialCategory';

export class Material {
  constructor(
    public readonly id: string,
    public readonly code: string,
    public readonly name: string,
    public readonly categoryId: string,
    public readonly defaultUnit: UnitOfMeasure
  ) {}
}
