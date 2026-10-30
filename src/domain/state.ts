// The whole saved app state: plain, serialisable data. Rules live in pure functions in sibling
// modules (team.ts, later box.ts, ...); TeamBuilder holds the current AppState and notifies the UI.
// Later tickets add fields here (box, mode, difficulty) with defaults in initialState() and
// migration in persistence.ts.
import { newTeam, type Team, type TeamId } from './team';

export interface AppState {
  schemaVersion: 1;
  teams: Team[];
  activeTeamId: TeamId;
}

export function initialState(): AppState {
  const team = newTeam('Team 1');
  return { schemaVersion: 1, teams: [team], activeTeamId: team.id };
}
