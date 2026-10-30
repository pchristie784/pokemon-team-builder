// Public API of the domain layer: the single seam between UI/tests and everything else.
// Add one export line per new public type or helper; behaviour goes on TeamBuilder.
import { TeamBuilder, type TeamBuilderOptions } from './teamBuilder';

export function createTeamBuilder(options: TeamBuilderOptions): TeamBuilder {
  return new TeamBuilder(options);
}

export type { TeamBuilder, TeamBuilderOptions, Listener } from './teamBuilder';
export { InMemoryStorage, LocalStorageAdapter, type StorageAdapter } from './storage';
export { DomainError, isDomainError, type DomainErrorCode } from './errors';
export { POKEMON_TYPES, typeName, type PokemonType } from './pokemonTypes';
export type * from './data/model';
export type { AppState } from './state';
export { MAX_TEAM_MEMBERS, type Team, type TeamId, type TeamMember, type TeamMemberId } from './team';
export type { TeamView, TeamMemberView } from './teamView';
