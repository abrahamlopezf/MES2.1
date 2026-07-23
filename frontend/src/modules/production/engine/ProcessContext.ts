export class ProcessContext {
  constructor(
    public readonly plant: string,
    public readonly area: string,
    public readonly station: string,
    public readonly machine: string,
    public readonly operator: string,
    public readonly shift: string,
    public readonly processDefinitionId: string,
    public readonly startedAt: Date,
    public readonly finishedAt?: Date
  ) {}
}
