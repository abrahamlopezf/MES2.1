/**
 * Representa la intención inmutable del usuario de cancelar un token.
 * No contiene lógica, solo los datos necesarios para la operación.
 */
export class CancelIdentityCommand {
  constructor(
    public readonly tokenId: string,
    public readonly reason: string,
    public readonly requestedByUserId: string
  ) {}
}
