// Public API of the domain layer: the single seam between UI/tests and everything else.
// Add one export line per new public type or helper; behaviour goes on TeamBuilder.
import { TeamBuilder, type TeamBuilderOptions } from './teamBuilder';

export function createTeamBuilder(options: TeamBuilderOptions): TeamBuilder {
  return new TeamBuilder(options);
}

export type { TeamBuilder, TeamBuilderOptions, Listener } from './teamBuilder';
export { InMemoryStorage, LocalStorageAdapter, type StorageAdapter } from './storage';
export { STORAGE_KEY } from './persistence';
export { DomainError, isDomainError, type DomainErrorCode } from './errors';
export { POKEMON_TYPES, typeName, type PokemonType } from './pokemonTypes';
export type * from './data/model';
export { DIFFICULTIES, type AppState, type Difficulty } from './state';
export { MAX_TEAM_MEMBERS, type Team, type TeamId, type TeamMember, type TeamMemberId } from './team';
export type { TeamView, TeamMemberView } from './teamView';
export type { Critique, CritiqueProblem } from './critique';
export type { DefensiveCoverage, TypeDefense, StackedWeakness, UnansweredType, QuadWeakness } from './critique/defensive';
export type { StatRole, StatRoles, MemberStatRoles, StatRoleProblem, AllPhysical, AllSpecial, NoFastMember } from './critique/statRoles';
export type { LearnableMove, MoveSource } from './data/learnset';
export { MAX_MOVES } from './team';
export type { AbilityOption } from './team';
export type { OffensiveCoverage, TypeOffense, CoverageSource, NoSuperEffectiveHit, ReducedDamageOnly } from './critique/offensive';
export type { MegaId, MegaOption } from './data/megas';
export { MODES, MIN_LEVEL, MAX_LEVEL, type Mode, type BoxEntry, type BoxEntryId, type BoxEntryView, type BoxCandidate, type TeamMemberLearnableMove } from './box';
export type { PlannedEvolution, EvolutionStep } from './data/evolutions';
export { MAX_SUGGESTIONS, problemLabel, type Suggestion, type SuggestionAction, type ProposedMove } from './suggest';
export { hasDataIssues, type DataIssues, type ImportPreview, type UnknownReference, type UnknownReferenceKind, type ReferenceLocation } from './exportImport';
