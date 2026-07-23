/**
 * Value Object genérico para el número de lote.
 */
export class BatchNumber {
  private constructor(public readonly value: string) {}

  public static create(value: string): BatchNumber {
    if (!value || value.trim().length === 0) {
      throw new Error('BatchNumber no puede estar vacío');
    }
    return new BatchNumber(value);
  }

  public equals(other: BatchNumber): boolean {
    return this.value === other.value;
  }
}

/**
 * Value Object para el tipo de etiqueta.
 */
export type TokenTypeValue = 'QR' | 'RFID' | 'NFC' | 'BARCODE' | 'DATAMATRIX';

export class TokenType {
  private constructor(public readonly value: TokenTypeValue) {}

  public static create(value: TokenTypeValue): TokenType {
    return new TokenType(value);
  }
}
