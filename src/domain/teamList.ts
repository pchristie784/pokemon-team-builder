// The list of saved Teams: create, rename, duplicate, delete and select the active Team.
// Pure functions over AppState; they throw DomainError on a broken rule.
import { DomainError } from './errors';
import { newId } from './ids';
import type { AppState } from './state';
import { findTeam, newTeam, updateTeam, type Team, type TeamId } from './team';

/** Adds an empty Team and makes it the active Team. A blank name becomes "Team N". */
export function createTeam(state: AppState, name: string): AppState {
  const team = newTeam(name.trim() || nextDefaultName(state));
  return { ...state, teams: [...state.teams, team], activeTeamId: team.id };
}

function nextDefaultName(state: AppState): string {
  const taken = new Set(state.teams.map((t) => t.name));
  let n = state.teams.length + 1;
  while (taken.has(`Team ${n}`)) n++;
  return `Team ${n}`;
}

/** Throws DomainError 'INVALID_TEAM_NAME' for a blank name. */
export function renameTeam(state: AppState, teamId: TeamId, name: string): AppState {
  const trimmed = name.trim();
  if (!trimmed) throw new DomainError('INVALID_TEAM_NAME', 'A Team needs a name');
  return updateTeam(state, teamId, (team) => ({ ...team, name: trimmed }));
}

/** Deep-copies a Team (new Team and Team Member ids), places it after the original and makes it active. */
export function duplicateTeam(state: AppState, teamId: TeamId): AppState {
  const original = findTeam(state, teamId);
  const clone = structuredClone(original);
  const copy: Team = {
    ...clone,
    id: newId(),
    name: `${original.name} (copy)`,
    members: clone.members.map((member) => ({ ...member, id: newId() })),
  };
  const teams = [...state.teams];
  teams.splice(teams.indexOf(original) + 1, 0, copy);
  return { ...state, teams, activeTeamId: copy.id };
}

/** Throws DomainError 'UNKNOWN_TEAM' for an unknown id. */
export function selectTeam(state: AppState, teamId: TeamId): AppState {
  const team = findTeam(state, teamId);
  return team.id === state.activeTeamId ? state : { ...state, activeTeamId: team.id };
}

/**
 * Removes a Team. If it was active, the Team now in its place (or the one before) becomes active.
 * There is always at least one Team: deleting the last one leaves a fresh empty "Team 1".
 */
export function deleteTeam(state: AppState, teamId: TeamId): AppState {
  const index = state.teams.indexOf(findTeam(state, teamId));
  const teams = state.teams.filter((t) => t.id !== teamId);
  if (teams.length === 0) {
    const fresh = newTeam('Team 1');
    return { ...state, teams: [fresh], activeTeamId: fresh.id };
  }
  const activeTeamId =
    state.activeTeamId === teamId ? teams[Math.min(index, teams.length - 1)]!.id : state.activeTeamId;
  return { ...state, teams, activeTeamId };
}
