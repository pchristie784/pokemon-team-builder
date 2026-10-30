// Rule violations surface as DomainError with a typed code. Later tickets add codes to the union.
export type DomainErrorCode =
  | 'TEAM_FULL' // a seventh Team Member
  | 'UNKNOWN_SPECIES'
  | 'UNKNOWN_TEAM'
  | 'UNKNOWN_TEAM_MEMBER';

export class DomainError extends Error {
  constructor(
    readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export function isDomainError(error: unknown, code?: DomainErrorCode): error is DomainError {
  return error instanceof DomainError && (code === undefined || error.code === code);
}
