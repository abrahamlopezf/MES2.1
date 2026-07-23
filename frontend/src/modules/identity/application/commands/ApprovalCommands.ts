export class ApproveIdentificationRequestCommand {
  constructor(
    public readonly requestId: string,
    public readonly approverUserId: string
  ) {}
}

export class RejectIdentificationRequestCommand {
  constructor(
    public readonly requestId: string,
    public readonly rejectorUserId: string,
    public readonly reason: string
  ) {}
}
