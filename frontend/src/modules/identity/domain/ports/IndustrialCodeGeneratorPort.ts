import { AreaId, PlantId } from '@shared/ids/brandTypes';
import { TokenTypeValue } from '../../valueObjects/IdentityValueObjects';
import { IndustrialCode } from '@shared/valueObjects/IndustrialCode';

/**
 * Puerto de Dominio: Generador de Códigos Industriales.
 * Abstrae la lógica de consecutivos y formato (ej. GS1, EPC, Interno).
 */
export interface IndustrialCodeGeneratorPort {
  /**
   * Genera un lote (arreglo) de códigos industriales consecutivos o definidos
   * según las reglas de la planta y el área.
   */
  generateCodes(
    plantId: PlantId, 
    areaId: AreaId, 
    type: TokenTypeValue, 
    amount: number
  ): Promise<IndustrialCode[]>;
}
