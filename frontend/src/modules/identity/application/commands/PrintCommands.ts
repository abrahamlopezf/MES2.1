export class CreatePrintJobCommand {
  constructor(
    public readonly batchId: string,
    public readonly templateId: string,
    public readonly idempotencyKey: string,
    public readonly requestedBy: string
  ) {}
}
