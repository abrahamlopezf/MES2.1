import { AggregateRoot } from '../../../../shared/domain/AggregateRoot';

export class MixBatch extends AggregateRoot {
  private constructor(
    public readonly id: string,
    public readonly identityTokenId: string,
    public readonly formulaId: string,
    public readonly quantity: number,
    public readonly unit: string,
    public readonly producedAt: Date
  ) {
    super();
  }

  public static create(
    id: string,
    identityTokenId: string,
    formulaId: string,
    quantity: number,
    unit: string,
    producedAt: Date
  ): MixBatch {
    return new MixBatch(id, identityTokenId, formulaId, quantity, unit, producedAt);
  }
}
