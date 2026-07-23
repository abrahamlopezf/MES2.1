import { MachineHealthStatus } from '../../domain/entities/MachineHealthState';

export class ChangeMachineHealthCommand {
  constructor(
    public readonly machineId: string,
    public readonly status: MachineHealthStatus
  ) {}
}
