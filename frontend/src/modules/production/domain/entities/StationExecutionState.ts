import { AggregateRoot } from '../../../../shared/domain/AggregateRoot';

export type StationExecutionStatus = 'IDLE' | 'RESERVED' | 'RUNNING' | 'PAUSED';

export class StationExecutionState extends AggregateRoot {
  constructor(
    public readonly stationId: string,
    private _status: StationExecutionStatus,
    private _currentTransformationId: string | null = null,
    private _operatorId: string | null = null,
    private _startedAt: Date | null = null
  ) {
    super();
  }

  get status(): StationExecutionStatus { return this._status; }
  get currentTransformationId(): string | null { return this._currentTransformationId; }
  get operatorId(): string | null { return this._operatorId; }
  get startedAt(): Date | null { return this._startedAt; }

  public reserve(operatorId: string): void {
    if (this._status !== 'IDLE') throw new Error('Station is not IDLE');
    this._status = 'RESERVED';
    this._operatorId = operatorId;
  }

  public startExecution(transformationId: string): void {
    if (this._status !== 'RESERVED' && this._status !== 'PAUSED') throw new Error('Station must be RESERVED or PAUSED to start');
    this._status = 'RUNNING';
    this._currentTransformationId = transformationId;
    if (!this._startedAt) this._startedAt = new Date();
  }

  public finishExecution(): void {
    if (this._status !== 'RUNNING') throw new Error('Station is not RUNNING');
    this._status = 'IDLE';
    this._currentTransformationId = null;
    this._operatorId = null;
    this._startedAt = null;
  }
}
