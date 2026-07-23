import { QrBatchId, UserId, AreaId, PlantId, IdentityTokenId } from '@shared/ids/brandTypes';
import { IdentityToken } from './IdentityToken';
import { BatchNumber, TokenTypeValue, TokenType } from '../valueObjects/IdentityValueObjects';
import { AggregateRoot } from '@shared/domain/AggregateRoot';
import { IndustrialCodeGeneratorPort } from '../ports/IndustrialCodeGeneratorPort';
import { UuidGeneratorPort, ClockPort } from '@shared/domain/ports/DomainPorts';
import { IdentityGenerated } from '../events/IdentityDomainEvents';

interface CreateBatchProps {
  id: QrBatchId;
  batchNumber: string;
  plantId: PlantId;
  areaId: AreaId;
  tokenType: TokenTypeValue;
  requestedBy: UserId;
}

/**
 * Aggregate Root: IdentityBatch
 * Controla la integridad transaccional de un lote de identidades.
 */
export class IdentityBatch extends AggregateRoot<QrBatchId> {
  private constructor(
    public readonly id: QrBatchId,
    public readonly batchNumber: BatchNumber,
    public readonly plantId: PlantId,
    public readonly areaId: AreaId,
    public readonly tokenType: TokenType,
    public readonly requestedBy: UserId,
    public readonly generatedAt: Date,
    private _tokens: IdentityToken[]
  ) {
    super();
  }

  public static create(props: CreateBatchProps, clock: ClockPort): IdentityBatch {
    return new IdentityBatch(
      props.id,
      BatchNumber.create(props.batchNumber),
      props.plantId,
      props.areaId,
      TokenType.create(props.tokenType),
      props.requestedBy,
      clock.now(),
      [] // Inicia sin tokens
    );
  }

  /**
   * Delega la responsabilidad de generar sus tokens al agregado mismo.
   */
  public async generateTokens(
    amount: number,
    codeGenerator: IndustrialCodeGeneratorPort,
    uuidGenerator: UuidGeneratorPort,
    clock: ClockPort
  ): Promise<void> {
    if (amount <= 0 || amount > 10000) {
      throw new Error(`Cantidad de tokens a generar (${amount}) fuera de los límites permitidos.`);
    }

    // 1. Obtener los códigos industriales del puerto (Ej. MTY-26-EXT-000001...)
    const codes = await codeGenerator.generateCodes(
      this.plantId,
      this.areaId,
      this.tokenType.value,
      amount
    );

    // 2. Instanciar los tokens
    this._tokens = codes.map((code) => {
      const tokenId = uuidGenerator.generate() as IdentityTokenId;
      return IdentityToken.create(tokenId, code, 'AVAILABLE', this.id as string);
    });

    // 3. Registrar Evento de Dominio
    this.addDomainEvent(
      new IdentityGenerated(
        uuidGenerator.generate(),
        this.id as string,
        clock.now(),
        this.id,
        this._tokens.map(t => ({ tokenId: t.id, industrialCode: t.industrialCode.value })),
        this.requestedBy
      )
    );
  }

  public get tokens(): ReadonlyArray<IdentityToken> {
    return this._tokens;
  }

  public get tokenCount(): number {
    return this._tokens.length;
  }
}
