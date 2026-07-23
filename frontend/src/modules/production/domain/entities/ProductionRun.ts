import { AggregateRoot } from '../../../../shared/domain/AggregateRoot';
import { ProductionRunStartedEvent, IdentityAssignmentRequestedEvent } from '../events/ProductionEvents';
import { 
  RunStatus, 
  StationId, 
  ProductionOrderId, 
  OperatorId, 
  MaterialRequirement 
} from '../valueObjects/ProductionValueObjects';
import { ClockPort, UuidGeneratorPort } from '../../../../shared/domain/ports/DomainPorts';

export class ProductionRun extends AggregateRoot {
  private _status: RunStatus;
  private _orderId: ProductionOrderId;
  private _stationId: StationId;
  private _operatorId: OperatorId;
  private _startedAt: Date | null = null;
  private _consumedMaterials: MaterialRequirement[] = [];
  private _outputIdentities: string[] = [];

  constructor(
    public readonly id: string,
    orderId: ProductionOrderId,
    stationId: StationId,
    operatorId: OperatorId,
    status: RunStatus = RunStatus.PENDING
  ) {
    super();
    this._orderId = orderId;
    this._stationId = stationId;
    this._operatorId = operatorId;
    this._status = status;
  }

  // --- Getters ---
  get status(): RunStatus { return this._status; }
  get orderId(): ProductionOrderId { return this._orderId; }
  get stationId(): StationId { return this._stationId; }
  get operatorId(): OperatorId { return this._operatorId; }
  get startedAt(): Date | null { return this._startedAt; }
  get consumedMaterials(): MaterialRequirement[] { return [...this._consumedMaterials]; }
  get outputIdentities(): string[] { return [...this._outputIdentities]; }

  // --- Comportamiento (Commands/Actions) ---

  public startExecution(
    reservedInputs: MaterialRequirement[],
    clock: ClockPort,
    uuidGenerator: UuidGeneratorPort,
    correlationId?: string
  ): void {
    if (this._status !== RunStatus.PENDING) {
      throw new Error(`No se puede iniciar una corrida que está en estado ${this._status}`);
    }

    this._status = RunStatus.RUNNING;
    this._startedAt = clock.now();
    
    // Reserva lógica de materiales
    this._consumedMaterials = [...reservedInputs];

    // Emitir evento de inicio
    this.addDomainEvent(
      new ProductionRunStartedEvent(
        uuidGenerator.generate(),
        this.id,
        this._startedAt,
        this._orderId,
        this._stationId,
        this._operatorId,
        correlationId
      )
    );
  }

  public requestIdentityAssignment(
    outputDefinitionId: string, 
    clock: ClockPort, 
    uuidGenerator: UuidGeneratorPort,
    correlationId?: string
  ): void {
    if (this._status !== RunStatus.RUNNING) {
      throw new Error(`Solo se puede solicitar identidad si la corrida está RUNNING`);
    }

    // Emitimos el evento solicitando identidad (IdentityAssignmentRequestedEvent)
    // El port de identidad podría ser llamado directamente o a través del bus.
    // Optamos por el evento para seguir el patrón coreográfico o como log de auditoría.
    this.addDomainEvent(
      new IdentityAssignmentRequestedEvent(
        uuidGenerator.generate(),
        this.id,
        clock.now(),
        outputDefinitionId,
        correlationId
      )
    );
  }

  // Permite al sistema o port inyectar la identidad creada asíncronamente
  public linkOutputIdentity(identityTokenId: string): void {
    if (!this._outputIdentities.includes(identityTokenId)) {
      this._outputIdentities.push(identityTokenId);
    }
  }
}
