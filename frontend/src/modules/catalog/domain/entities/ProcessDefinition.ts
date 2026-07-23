export abstract class ProcessDefinition {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly type: string,
    public readonly version: string = '1.0.0',
    public readonly effectiveFrom: Date = new Date(),
    public readonly effectiveTo?: Date
  ) {}
}
