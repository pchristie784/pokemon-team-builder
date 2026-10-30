// The stateful facade over the domain layer. Holds the current AppState, applies pure
// actions from the concern modules, saves through the StorageAdapter and notifies subscribers.
//
// Growing it: add a thin method per use case, grouped under a section comment for your ticket,
// delegating to a pure function in its own module (e.g. box.ts, critique/, suggest.ts).
// Mutations go through `apply`; queries read `this.state` and `this.data`.
import { loadSnapshot } from './data/load';
import type { DataVersion, Species, SpeciesId } from './data/model';
import type { DataSnapshot } from './data/snapshot';
import { loadState, saveState } from './persistence';
import type { AppState } from './state';
import type { StorageAdapter } from './storage';
import {
  addTeamMember,
  findTeam,
  removeTeamMember,
  type Team,
  type TeamId,
  type TeamMemberId,
} from './team';
import { viewTeam, type TeamView } from './teamView';

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
    const next = action(this.state); // throws DomainError before anything changes
    if (next === this.state) return;
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
    return viewTeam(findTeam(this.state, teamId), this.data);
  }

  /** Throws DomainError 'TEAM_FULL' for a seventh Team Member. */
  addTeamMember(teamId: TeamId, speciesId: SpeciesId): void {
    this.apply((s) => addTeamMember(s, this.data, teamId, speciesId));
  }

  removeTeamMember(teamId: TeamId, memberId: TeamMemberId): void {
    this.apply((s) => removeTeamMember(s, teamId, memberId));
  }
}
