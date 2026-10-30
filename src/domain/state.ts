// The whole saved app state: plain, serialisable data. Rules live in pure functions in sibling
// modules (team.ts, later box.ts, ...); TeamBuilder holds the current AppState and notifies the UI.
// Later tickets add fields here (box, mode, difficulty) with defaults in initialState() and
// migration in persistence.ts.
import type { DataVersion } from './data/model';
import { newTeam, type Team, type TeamId } from './team';
import type { BoxEntry, Mode } from './box';

export interface AppState {
  schemaVersion: 1;
  teams: Team[];
  activeTeamId: TeamId;
  /** The playthrough's Difficulty; decides which Boss parties apply. */
  difficulty: Difficulty;
  /** The data snapshot version this state was last saved with (null before the first save). */
  dataVersion: DataVersion | null;
  /** The Box: Box Entries the player owns (one Box per app). */
  box: BoxEntry[];
  /** Box Mode or Dex Mode; defaults to Dex Mode (see box.ts). */
  mode: Mode;
}

export const DIFFICULTIES = ['NORMAL', 'HARD'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export function initialState(): AppState {
  const team = newTeam('Team 1');
  return { schemaVersion: 1, teams: [team], activeTeamId: team.id, difficulty: 'NORMAL', dataVersion: null, box: [], mode: 'DEX' };
}

export function setDifficulty(state: AppState, difficulty: Difficulty): AppState {
  return state.difficulty === difficulty ? state : { ...state, difficulty };
}
