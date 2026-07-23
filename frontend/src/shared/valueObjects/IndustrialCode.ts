/**
 * Value Object para el Industrial Code.
 * Encapsula la lógica de validación y extracción de partes (Planta, Año, Prefijo, Secuencia).
 */
export class IndustrialCode {
  private constructor(public readonly value: string) {}

  public static create(value: string): IndustrialCode {
    if (!IndustrialCode.isValid(value)) {
      console.error(`Validación falló para: "${value}"`);
      console.error(`Longitud: ${value.length}`);
      for(let i=0; i<value.length; i++) console.error(`Char ${i}: ${value.charCodeAt(i)}`);
      throw new Error(`IndustrialCode inválido: ${value}`);
    }
    return new IndustrialCode(value);
  }

  public static isValid(value: string): boolean {
    // Ejemplo de formato anterior: MTY-26-EXT-000001
    // const regex = /^[A-Z]{3}-\d{2}-[A-Z]{3}-\d{6}$/;
    
    // Nuevo formato sin planta: 26-EXT-000001
    const regex = /^\d{2}-[A-Z]{3}-\d{6}$/;
    const result = regex.test(value);
    if (!result) {
      console.error("Regex eval:", regex, "en value:", value, "resultado:", result);
    }
    return result;
  }

  // get plant(): string {
  //   return this.value.split('-')[0];
  // }

  get year(): string {
    return this.value.split('-')[0]; // Ahora es el índice 0
  }

  get prefix(): string {
    return this.value.split('-')[1]; // Ahora es el índice 1
  }

  get sequence(): string {
    return this.value.split('-')[2]; // Ahora es el índice 2
  }

  public toString(): string {
    return this.value;
  }
}
