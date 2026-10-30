// Team and Team Member model and rules. Pure functions over AppState; they throw DomainError on a broken rule.
import type { Ability, AbilityId, MoveId, Species, SpeciesId } from './data/model';
import { isLearnable } from './data/learnset';
import type { DataSnapshot } from './data/snapshot';
import { findMega, type MegaId } from './data/megas';
import { DomainError } from './errors';
import { newId } from './ids';
import type { AppState } from './state';

export type TeamId = string;
export type TeamMemberId = string;

export const MAX_TEAM_MEMBERS = 6;
export const MAX_MOVES = 4;

/** A Species plus up to four chosen moves, an optional Ability and an optional Mega toggle (GLOSSARY.md). */
export interface TeamMember {
  id: TeamMemberId;
  speciesId: SpeciesId;
  moves: MoveId[];
  abilityId: AbilityId | null;
  /** The toggled-on Mega, or null when Mega is off. At most one per Team. */
  mega: MegaId | null;
  /** The Box Entry it was chosen from (Box Mode, ticket 09); null or absent when not linked to one. */
  boxEntryId?: string | null;
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
    const member: TeamMember = { id: newId(), speciesId, moves: [], abilityId: null, mega: null };
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

// --- Moves ---

/** Replace a Team Member's moves: at most four, each learnable by its Species, no duplicates. */
export function setTeamMemberMoves(
  state: AppState,
  data: DataSnapshot,
  teamId: TeamId,
  memberId: TeamMemberId,
  moveIds: MoveId[],
): AppState {
  return updateTeamMember(state, teamId, memberId, (member) => {
    if (moveIds.length > MAX_MOVES) {
      throw new DomainError('TOO_MANY_MOVES', `A Team Member has at most ${MAX_MOVES} moves`);
    }
    if (new Set(moveIds).size !== moveIds.length) {
      throw new DomainError('DUPLICATE_MOVE', 'A Team Member cannot know the same move twice');
    }
    for (const moveId of moveIds) {
      if (!isLearnable(data, member.speciesId, moveId)) {
        throw new DomainError('MOVE_NOT_LEARNABLE', `${member.speciesId} cannot learn ${moveId}`);
      }
    }
    return { ...member, moves: [...moveIds] };
  });
}

export function addTeamMemberMove(
  state: AppState,
  data: DataSnapshot,
  teamId: TeamId,
  memberId: TeamMemberId,
  moveId: MoveId,
): AppState {
  const member = findTeam(state, teamId).members.find((m) => m.id === memberId);
  if (!member) throw new DomainError('UNKNOWN_TEAM_MEMBER', `No Team Member with id ${memberId}`);
  if (member.moves.includes(moveId)) {
    throw new DomainError('DUPLICATE_MOVE', 'A Team Member cannot know the same move twice');
  }
  return setTeamMemberMoves(state, data, teamId, memberId, [...member.moves, moveId]);
}

export function removeTeamMemberMove(
  state: AppState,
  teamId: TeamId,
  memberId: TeamMemberId,
  moveId: MoveId,
): AppState {
  return updateTeamMember(state, teamId, memberId, (member) => ({
    ...member,
    moves: member.moves.filter((m) => m !== moveId),
  }));
}

// --- Ability (ticket 03) ---

/** One choosable Ability for a Team Member; Innates are always on and never choosable. */
export interface AbilityOption {
  ability: Ability;
  hidden: boolean;
}

/** The Species' regular then hidden abilities, each listed once. */
export function abilityOptions(species: Species, data: DataSnapshot): AbilityOption[] {
  const seen = new Set<AbilityId>(['ABILITY_NONE']);
  const options: AbilityOption[] = [];
  const add = (id: AbilityId, hidden: boolean) => {
    if (seen.has(id)) return;
    seen.add(id);
    options.push({ ability: data.getAbility(id) ?? { id, name: id, description: '' }, hidden });
  };
  for (const id of species.regularAbilities) add(id, false);
  for (const id of species.hiddenAbilities) add(id, true);
  return options;
}

/** Choose a Team Member's Ability; null clears it. Throws 'INVALID_ABILITY' for anything not choosable. */
export function setTeamMemberAbility(
  state: AppState,
  data: DataSnapshot,
  teamId: TeamId,
  memberId: TeamMemberId,
  abilityId: AbilityId | null,
): AppState {
  return updateTeamMember(state, teamId, memberId, (member) => {
    if (abilityId !== null) {
      const species = data.getSpecies(member.speciesId);
      const choosable = species ? abilityOptions(species, data).some((o) => o.ability.id === abilityId) : false;
      if (!choosable) {
        throw new DomainError('INVALID_ABILITY', `${abilityId} is not a regular or hidden ability of ${member.speciesId}`);
      }
    }
    return member.abilityId === abilityId ? member : { ...member, abilityId };
  });
}

// --- Mega (ticket 07) ---

/** Toggle a Mega on (by id) or off (null). Throws 'INVALID_MEGA' or 'SECOND_MEGA' (at most one Mega per Team). */
export function setTeamMemberMega(
  state: AppState,
  data: DataSnapshot,
  teamId: TeamId,
  memberId: TeamMemberId,
  megaId: MegaId | null,
): AppState {
  const team = findTeam(state, teamId);
  if (megaId !== null && team.members.some((m) => m.id !== memberId && m.mega !== null)) {
    throw new DomainError('SECOND_MEGA', 'A Team can have at most one Mega toggled on');
  }
  return updateTeamMember(state, teamId, memberId, (member) => {
    if (megaId !== null && !findMega(data, member.speciesId, megaId)) {
      throw new DomainError('INVALID_MEGA', `${megaId} is not a Mega of ${member.speciesId}`);
    }
    return member.mega === megaId ? member : { ...member, mega: megaId };
  });
}
