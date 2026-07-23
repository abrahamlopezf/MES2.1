export class IdentityDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class IdentityAlreadyCancelledError extends IdentityDomainError {
  constructor(tokenId: string) {
    super(`El token de identidad ${tokenId} ya se encuentra cancelado.`);
  }
}

export class InvalidStatusTransitionError extends IdentityDomainError {
  constructor(fromStatus: string, toStatus: string) {
    super(`Transición de estado inválida: no se puede pasar de ${fromStatus} a ${toStatus}.`);
  }
}

export class BatchLimitExceededError extends IdentityDomainError {
  constructor(requested: number, limit: number) {
    super(`El tamaño del lote (${requested}) excede el límite permitido (${limit}).`);
  }
}

export class InvalidIndustrialCodeError extends IdentityDomainError {
  constructor(code: string) {
    super(`El formato del código industrial ${code} es inválido.`);
  }
}

export class TokenAlreadyAssignedError extends IdentityDomainError {
  constructor(tokenId: string) {
    super(`El token ${tokenId} ya ha sido asignado a un material u operación.`);
  }
}
