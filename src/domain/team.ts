// Team and Team Member model and rules. Pure functions over AppState; they throw DomainError on a broken rule.
import type { AbilityId, MoveId, SpeciesId } from './data/model';
import type { DataSnapshot } from './data/snapshot';
import { DomainError } from './errors';
import { newId } from './ids';
import type { AppState } from './state';

export type TeamId = string;
export type TeamMemberId = string;

export const MAX_TEAM_MEMBERS = 6;

/** A Species plus up to four chosen moves, an optional Ability and an optional Mega toggle (GLOSSARY.md). */
export interface TeamMember {
  id: TeamMemberId;
  speciesId: SpeciesId;
  moves: MoveId[];
  abilityId: AbilityId | null;
  mega: boolean;
}

export interface Team {
  id: TeamId;
  name: string;
  members: TeamMember[];
}

export function newTeam(name: string): Team {
  return { id: newId(), name, members: [] };
}

export function findTeam(state: AppState, teamId: TeamId): Team {
  const team = state.teams.find((t) => t.id === teamId);
  if (!team) throw new DomainError('UNKNOWN_TEAM', `No Team with id ${teamId}`);
  return team;
}

/** Replace one Team immutably. */
export function updateTeam(state: AppState, teamId: TeamId, change: (team: Team) => Team): AppState {
  const team = findTeam(state, teamId);
  return { ...state, teams: state.teams.map((t) => (t === team ? change(t) : t)) };
}

/** Replace one Team Member immutably. */
export function updateTeamMember(
  state: AppState,
  teamId: TeamId,
  memberId: TeamMemberId,
  change: (member: TeamMember) => TeamMember,
): AppState {
  return updateTeam(state, teamId, (team) => {
    const member = team.members.find((m) => m.id === memberId);
    if (!member) throw new DomainError('UNKNOWN_TEAM_MEMBER', `No Team Member with id ${memberId}`);
    return { ...team, members: team.members.map((m) => (m === member ? change(m) : m)) };
  });
}

export function addTeamMember(
  state: AppState,
  data: DataSnapshot,
  teamId: TeamId,
  speciesId: SpeciesId,
): AppState {
  if (!data.getSpecies(speciesId)) {
    throw new DomainError('UNKNOWN_SPECIES', `${speciesId} is not a Species in this data snapshot`);
  }
  return updateTeam(state, teamId, (team) => {
    if (team.members.length >= MAX_TEAM_MEMBERS) {
      throw new DomainError('TEAM_FULL', `A Team has at most ${MAX_TEAM_MEMBERS} Team Members`);
    }
    const member: TeamMember = { id: newId(), speciesId, moves: [], abilityId: null, mega: false };
    return { ...team, members: [...team.members, member] };
  });
}

export function removeTeamMember(state: AppState, teamId: TeamId, memberId: TeamMemberId): AppState {
  return updateTeam(state, teamId, (team) => {
    if (!team.members.some((m) => m.id === memberId)) {
      throw new DomainError('UNKNOWN_TEAM_MEMBER', `No Team Member with id ${memberId}`);
    }
    return { ...team, members: team.members.filter((m) => m.id !== memberId) };
  });
}
