// Rule violations surface as DomainError with a typed code. Later tickets add codes to the union.
export type DomainErrorCode =
  | 'TEAM_FULL' // a seventh Team Member
  | 'UNKNOWN_SPECIES'
  | 'UNKNOWN_TEAM'
  | 'UNKNOWN_TEAM_MEMBER'
  | 'TOO_MANY_MOVES' // a fifth move on a Team Member
  | 'MOVE_NOT_LEARNABLE' // not in the Species' learnset (or not a move at all)
  | 'DUPLICATE_MOVE' // the same move twice on a Team Member
  | 'INVALID_ABILITY' // not one of the Species' regular or hidden abilities
  | 'INVALID_TEAM_NAME' // a blank Team name
  | 'UNKNOWN_BOX_ENTRY'
  | 'INVALID_LEVEL' // a Box Entry level that is not a whole number from 1 to 100
  | 'NOT_IN_BOX' // Box Mode: a Species that is not a Box Entry or one of its Planned Evolutions
  | 'INVALID_MEGA' // not a Mega of the Team Member's Species
  | 'SECOND_MEGA'; // a second Mega toggled on in the same Team

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
