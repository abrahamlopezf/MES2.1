import { AggregateRoot } from '../../../../shared/domain/AggregateRoot';

export type MachineHealthStatus = 'ONLINE' | 'OFFLINE' | 'FAULT' | 'MAINTENANCE';

export class MachineHealthState extends AggregateRoot {
  constructor(
    public readonly machineId: string,
    public readonly stationId: string, // A qué estación pertenece
    private _status: MachineHealthStatus,
    private _lastReportedAt: Date = new Date()
  ) {
    super();
  }

  get status(): MachineHealthStatus { return this._status; }
  get lastReportedAt(): Date { return this._lastReportedAt; }

  public setStatus(newStatus: MachineHealthStatus): void {
    this._status = newStatus;
    this._lastReportedAt = new Date();
  }
}
