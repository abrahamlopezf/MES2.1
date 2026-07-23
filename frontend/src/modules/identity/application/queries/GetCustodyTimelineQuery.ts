export class GetCustodyTimelineQuery {
  constructor(
    public readonly identityTokenId: string,
    public readonly requestedBy: string
  ) {}
}
