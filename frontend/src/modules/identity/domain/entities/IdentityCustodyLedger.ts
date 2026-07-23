import { AggregateRoot } from '@shared/domain/AggregateRoot';
import { CustodyMovement } from './CustodyMovement';
import { CustodyOwner, TransferReason } from '../valueObjects/CustodyValueObjects';
import { IdentityCustodyTransferredEvent } from '../events/CustodyEvents';
import { ClockPort, UuidGeneratorPort } from '@shared/domain/ports/DomainPorts';
import { UserId } from '@shared/ids/brandTypes';

/**
 * Aggregate Root: IdentityCustodyLedger
 * Controla el historial inmutable de movimientos de una identidad física.
 */
export class IdentityCustodyLedger extends AggregateRoot<string> {
  // Array Inmutable (Append-Only)
  private _movements: readonly CustodyMovement[];

  private constructor(
    public readonly identityTokenId: string,
    initialMovements: readonly CustodyMovement[] = []
  ) {
    super();
    this._movements = initialMovements;
  }

  /**
   * Reconstituye el Ledger a partir del historial persistido.
   */
  public static load(identityTokenId: string, movements: CustodyMovement[]): IdentityCustodyLedger {
    return new IdentityCustodyLedger(identityTokenId, [...movements]);
  }

  /**
   * Inicializa un nuevo Ledger (ej. Al generar la etiqueta y asignarla al almacén central).
   */
  public static initialize(
    identityTokenId: string, 
    initialOwner: CustodyOwner, 
    actorId: UserId,
    clock: ClockPort, 
    uuid: UuidGeneratorPort
  ): IdentityCustodyLedger {
    const ledger = new IdentityCustodyLedger(identityTokenId);
    
    const initialMovement = CustodyMovement.create(
      identityTokenId,
      'SYSTEM', // El creador original
      initialOwner,
      TransferReason.STORAGE,
      actorId,
      clock,
      uuid
    );

    ledger.recordMovement(initialMovement, uuid);
    return ledger;
  }

  public get movements(): readonly CustodyMovement[] {
    return this._movements;
  }

  public get currentOwner(): CustodyOwner | null {
    if (this._movements.length === 0) return null;
    return this._movements[this._movements.length - 1].toOwner;
  }

  /**
   * Ejecuta una transferencia de custodia validando la secuencia lógica.
   */
  public transfer(
    toOwner: CustodyOwner,
    reason: TransferReason,
    actorId: UserId,
    clock: ClockPort,
    uuid: UuidGeneratorPort,
    correlationId?: string
  ): void {
    const fromOwner = this.currentOwner;
    
    if (!fromOwner) {
      throw new Error(`El token ${this.identityTokenId} no tiene un dueño inicial registrado.`);
    }

    if (fromOwner === toOwner) {
      throw new Error(`El token ya se encuentra en custodia de ${toOwner}.`);
    }

    const movement = CustodyMovement.create(
      this.identityTokenId,
      fromOwner,
      toOwner,
      reason,
      actorId,
      clock,
      uuid
    );

    this.recordMovement(movement, uuid, correlationId);
  }

  /**
   * Agrega un movimiento a la historia (Append-Only) y encola el evento.
   */
  private recordMovement(movement: CustodyMovement, uuid: UuidGeneratorPort, correlationId?: string): void {
    // Inmutabilidad estricta: Creamos un nuevo array
    this._movements = [...this._movements, movement];

    this.addDomainEvent(
      new IdentityCustodyTransferredEvent(
        uuid.generate(),
        this.identityTokenId,
        movement.occurredAt,
        movement.fromOwner,
        movement.toOwner,
        movement.reason,
        movement.transferredBy,
        correlationId
      )
    );
  }
}
