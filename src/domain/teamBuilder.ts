// The stateful facade over the domain layer. Holds the current AppState, applies pure
// actions from the concern modules, saves through the StorageAdapter and notifies subscribers.
//
// Growing it: add a thin method per use case, grouped under a section comment for your ticket,
// delegating to a pure function in its own module (e.g. box.ts, critique/, suggest.ts).
// Mutations go through `apply`; queries read `this.state` and `this.data`.
import { critique, type Critique } from './critique';
import { plannedEvolutions, type PlannedEvolution } from './data/evolutions';
import { addBoxEntry, addTeamMemberInMode, boxCandidates, boxLinkOf, flagLevelUpMoves, type TeamMemberLearnableMove, setMode, type BoxCandidate, type Mode, removeBoxEntry, setBoxEntryLevel, setBoxEntrySpecies, viewBox, type BoxEntryId, type BoxEntryView } from './box';
import { learnableMoves, type LearnableMove } from './data/learnset';
import { loadSnapshot } from './data/load';
import type { AbilityId, DataVersion, MoveId, Species, SpeciesId } from './data/model';
import type { DataSnapshot } from './data/snapshot';
import { loadState, saveState, stampDataVersion } from './persistence';
import { setDifficulty, type AppState, type Difficulty } from './state';
import type { StorageAdapter } from './storage';
import {
  abilityOptions,
  addTeamMemberMove,
  findTeam,
  findTeamMember,
  moveTeamMember,
  removeTeamMember,
  removeTeamMemberMove,
  setTeamMemberAbility,
  setTeamMemberMega,
  setTeamMemberMoves,
  type AbilityOption,
  type Team,
  type TeamId,
  type TeamMemberId,
} from './team';
import { createTeam, deleteTeam, duplicateTeam, renameTeam, selectTeam } from './teamList';
import { viewTeam, type TeamView } from './teamView';
import { megaOptions, type MegaId, type MegaOption } from './data/megas';
import { dataIssues, exportState, parseExport, previewImport, type DataIssues, type ImportPreview } from './exportImport';
import { applySuggestion, suggest, type Suggestion } from './suggest';

export interface TeamBuilderOptions {
  storage: StorageAdapter;
  /** Defaults to the vendored Soulgold snapshot. */
  data?: DataSnapshot;
}

export type Listener = (state: AppState) => void;

export class TeamBuilder {
  private readonly data: DataSnapshot;
  private readonly storage: StorageAdapter;
  private readonly listeners = new Set<Listener>();
  private state: AppState;

  constructor(options: TeamBuilderOptions) {
    this.data = options.data ?? loadSnapshot();
    this.storage = options.storage;
    this.state = loadState(this.storage);
  }

  // --- State and subscription (for React's useSyncExternalStore) ---

  /** The current immutable AppState; a new object after every change. */
  getState = (): AppState => this.state;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private apply(action: (state: AppState) => AppState): void {
    const changed = action(this.state); // throws DomainError before anything changes
    if (changed === this.state) return;
    const next = stampDataVersion(changed, this.data.version);
    this.state = next;
    saveState(this.storage, next);
    for (const listener of this.listeners) listener(next);
  }

  // --- Data snapshot ---

  getDataVersion(): DataVersion {
    return this.data.version;
  }

  getSpecies(id: SpeciesId): Species | undefined {
    return this.data.getSpecies(id);
  }

  searchSpecies(query: string, limit?: number): Species[] {
    return this.data.searchSpecies(query, limit);
  }

  // --- Teams ---

  getTeams(): Team[] {
    return this.state.teams;
  }

  getActiveTeamId(): TeamId {
    return this.state.activeTeamId;
  }

  getTeam(teamId: TeamId): TeamView {
    return viewTeam(findTeam(this.state, teamId), this.data, this.state.box);
  }

  /**
   * Throws DomainError 'TEAM_FULL' for a seventh Team Member. In Box Mode the Species must be a Box Entry or
   * one of its Planned Evolutions ('NOT_IN_BOX'); `boxEntryId` picks the Box Entry (else the first unused one that fits).
   * A Box Entry backs at most one Team Member per Team ('BOX_ENTRY_IN_USE').
   */
  addTeamMember(teamId: TeamId, speciesId: SpeciesId, boxEntryId?: BoxEntryId): void {
    this.apply((s) => addTeamMemberInMode(s, this.data, teamId, speciesId, boxEntryId));
  }

  removeTeamMember(teamId: TeamId, memberId: TeamMemberId): void {
    this.apply((s) => removeTeamMember(s, teamId, memberId));
  }

  /** Moves a Team Member to `toIndex` (0-based). Throws DomainError 'INVALID_POSITION' outside the Team. */
  moveTeamMember(teamId: TeamId, memberId: TeamMemberId, toIndex: number): void {
    this.apply((s) => moveTeamMember(s, teamId, memberId, toIndex));
  }

  // --- Critique ---

  /** The Critique of a Team; derived on every call, never stored. */
  getCritique(teamId: TeamId): Critique {
    return critique(this.getTeam(teamId));
  }

  // --- Saved Teams and settings ---

  /** Adds an empty Team, makes it active and returns its id. */
  createTeam(name: string): TeamId {
    this.apply((s) => createTeam(s, name));
    return this.state.activeTeamId;
  }

  /** Throws DomainError 'INVALID_TEAM_NAME' for a blank name. */
  renameTeam(teamId: TeamId, name: string): void {
    this.apply((s) => renameTeam(s, teamId, name));
  }

  /** Copies a Team with new Team Member ids, makes the copy active and returns its id. */
  duplicateTeam(teamId: TeamId): TeamId {
    this.apply((s) => duplicateTeam(s, teamId));
    return this.state.activeTeamId;
  }

  /** Throws DomainError 'UNKNOWN_TEAM' for an unknown id. */
  selectTeam(teamId: TeamId): void {
    this.apply((s) => selectTeam(s, teamId));
  }

  /** Deleting the last Team leaves a fresh empty one, so there is always an active Team. */
  deleteTeam(teamId: TeamId): void {
    this.apply((s) => deleteTeam(s, teamId));
  }

  getDifficulty(): Difficulty {
    return this.state.difficulty;
  }

  setDifficulty(difficulty: Difficulty): void {
    this.apply((s) => setDifficulty(s, difficulty));
  }

  /** The data version the saved data was last saved with; null if nothing has been saved yet. */
  getSavedDataVersion(): DataVersion | null {
    return this.state.dataVersion;
  }

  // --- Moves and Offensive Coverage ---

  /** Every move a Species can learn, each with all its sources (level-up with level, TM/HM, tutor, egg). */
  getLearnableMoves(speciesId: SpeciesId): LearnableMove[] {
    return learnableMoves(this.data, speciesId);
  }

  /** Throws DomainError 'TOO_MANY_MOVES', 'MOVE_NOT_LEARNABLE' or 'DUPLICATE_MOVE'. */
  setTeamMemberMoves(teamId: TeamId, memberId: TeamMemberId, moveIds: MoveId[]): void {
    this.apply((s) => setTeamMemberMoves(s, this.data, teamId, memberId, moveIds));
  }

  /** Throws DomainError 'TOO_MANY_MOVES', 'MOVE_NOT_LEARNABLE' or 'DUPLICATE_MOVE'. */
  addTeamMemberMove(teamId: TeamId, memberId: TeamMemberId, moveId: MoveId): void {
    this.apply((s) => addTeamMemberMove(s, this.data, teamId, memberId, moveId));
  }

  removeTeamMemberMove(teamId: TeamId, memberId: TeamMemberId, moveId: MoveId): void {
    this.apply((s) => removeTeamMemberMove(s, teamId, memberId, moveId));
  }

  // --- Innates and Abilities ---

  /** The Team Member's choosable Abilities: its Species' regular then hidden abilities, each once. Throws 'UNKNOWN_TEAM_MEMBER'. */
  getAbilityOptions(teamId: TeamId, memberId: TeamMemberId): AbilityOption[] {
    const species = this.data.getSpecies(findTeamMember(this.state, teamId, memberId).speciesId);
    return species ? abilityOptions(species, this.data) : []; // a Species missing from the snapshot: a Data Issue
  }

  /** null clears the Ability. Throws DomainError 'INVALID_ABILITY' if not a regular or hidden ability. */
  setTeamMemberAbility(teamId: TeamId, memberId: TeamMemberId, abilityId: AbilityId | null): void {
    this.apply((s) => setTeamMemberAbility(s, this.data, teamId, memberId, abilityId));
  }

  // --- Mega ---

  /** The Megas a Species can toggle on (several for e.g. Charizard X/Y); empty when it has none. */
  getMegaOptions(speciesId: SpeciesId): MegaOption[] {
    return megaOptions(this.data, speciesId);
  }

  /** null turns Mega off. Throws DomainError 'INVALID_MEGA' or 'SECOND_MEGA' (at most one Mega per Team). */
  setTeamMemberMega(teamId: TeamId, memberId: TeamMemberId, megaId: MegaId | null): void {
    this.apply((s) => setTeamMemberMega(s, this.data, teamId, memberId, megaId));
  }

  // --- Box, Box Mode and Planned Evolutions ---

  getBox(): BoxEntryView[] {
    return viewBox(this.state, this.data);
  }

  /** Adds a Box Entry (duplicates allowed) and returns its id. Throws 'UNKNOWN_SPECIES' or 'INVALID_LEVEL'. */
  addBoxEntry(speciesId: SpeciesId, level: number | null = null): BoxEntryId {
    this.apply((s) => addBoxEntry(s, this.data, speciesId, level));
    return this.state.box[this.state.box.length - 1]!.id;
  }

  /** null clears the level. Throws 'INVALID_LEVEL' outside 1–100. */
  setBoxEntryLevel(id: BoxEntryId, level: number | null): void {
    this.apply((s) => setBoxEntryLevel(s, id, level));
  }

  /** E.g. after it evolves in-game. Team Members that no longer fit this Box Entry are unlinked from it. */
  setBoxEntrySpecies(id: BoxEntryId, speciesId: SpeciesId): void {
    this.apply((s) => setBoxEntrySpecies(s, this.data, id, speciesId));
  }

  /** Team Members chosen from it stay on their Teams, unlinked from the Box. */
  removeBoxEntry(id: BoxEntryId): void {
    this.apply((s) => removeBoxEntry(s, id));
  }

  /** Every later evolution of a Species (all branches), each labelled with its path and method. */
  getPlannedEvolutions(speciesId: SpeciesId): PlannedEvolution[] {
    return plannedEvolutions(this.data, speciesId);
  }

  getMode(): Mode {
    return this.state.mode;
  }

  /** Never changes Teams: Box Mode restrictions apply when adding Team Members. */
  setMode(mode: Mode): void {
    this.apply((s) => setMode(s, mode));
  }

  /** The Box Mode candidate pool: each Box Entry's Species, then its Planned Evolutions, in Box order. */
  getBoxCandidates(): BoxCandidate[] {
    return boxCandidates(this.state, this.data);
  }

  /** A Team Member's learnable moves, each flagged if learned by level-up only above its Box Entry's level. */
  getTeamMemberLearnableMoves(teamId: TeamId, memberId: TeamMemberId): TeamMemberLearnableMove[] {
    const member = findTeamMember(this.state, teamId, memberId);
    const { boxEntry } = boxLinkOf(member, this.state.box, this.data);
    return flagLevelUpMoves(learnableMoves(this.data, member.speciesId), boxEntry);
  }

  // --- Suggestions ---

  /** Ranked Suggestions that fix the Team's Critique problems; add a new Team Member (under six) or replace one (full). */
  suggest(teamId: TeamId): Suggestion[] {
    return suggest(this.state, this.data, teamId);
  }

  /** Adds or replaces in one action, keeping the replaced member's position. Mode rules apply as when adding. */
  applySuggestion(teamId: TeamId, suggestion: Suggestion): void {
    this.apply((s) => applySuggestion(s, this.data, teamId, suggestion));
  }

  // --- Export and import ---

  /** All data (Box, Teams, mode, Difficulty, data version) as versioned JSON, for the player to download. */
  exportData(): string {
    return exportState(this.state, this.data);
  }

  /** What importing the JSON would bring in, and any Data Issues; never changes state. */
  previewImport(json: string): ImportPreview {
    return previewImport(json, this.data);
  }

  /** Replaces all current data with the export (after the player confirms). Throws DomainError 'INVALID_IMPORT'. */
  importData(json: string): void {
    const { state } = parseExport(json);
    this.apply(() => state);
  }

  /** Unknown Species, moves, Abilities or Megas in the current data, and a data version mismatch. */
  getDataIssues(): DataIssues {
    return dataIssues(this.state, this.data);
  }
}
