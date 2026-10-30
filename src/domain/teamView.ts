// Read models for the UI: a Team with its members' Species data resolved.
// Ticket 03 (chosen Ability), 06 (Stat Roles) and 07 (Mega) extend TeamMemberView here.
import type { Ability, AbilityId, BaseStats, Move, Species } from './data/model';
import { findMega, type MegaOption } from './data/megas';
import type { DataSnapshot } from './data/snapshot';
import type { PokemonType } from './pokemonTypes';
import { statRolesOf, type StatRole } from './critique/statRoles';
import { boxLinkOf, type BoxEntry } from './box';
import type { PlannedEvolution } from './data/evolutions';
import { MAX_TEAM_MEMBERS, type Team, type TeamId, type TeamMember } from './team';

export interface TeamMemberView {
  member: TeamMember;
  id: TeamMember['id'];
  species: Species;
  /** Effective typing: the Mega's while Mega is on, else the Species'. */
  types: PokemonType[];
  /** Effective base stats (the Mega's while Mega is on); Stat Roles read these. */
  stats: BaseStats;
  /** Stat Roles from the effective `stats` above. */
  statRoles: StatRole[];
  /** Effective Innates: the Mega's while Mega is on (Megas have their own), else the Species'. */
  innates: Ability[];
  /** The chosen Ability (regular or hidden), or null when none is chosen. Kept, but not in effect, while Mega is on. */
  ability: Ability | null;
  /** The toggled-on Mega, or null when Mega is off (or its id is unknown to this snapshot). */
  mega: MegaOption | null;
  /**
   * Every Innate and Ability in effect for the Critique: effective `innates` plus the Mega's ability while
   * Mega is on, else the chosen Ability. Defensive and offensive ability effects read this.
   */
  effectiveAbilityIds: AbilityId[];
  /** Chosen moves, resolved; moves missing from the snapshot are left out (flagged by ticket 10). */
  moves: Move[];
  /** The Box Entry it was chosen from (Box Mode), or null when not linked to one. */
  boxEntry: BoxEntry | null;
  /** Set when it is a Planned Evolution: a later evolution of its Box Entry, not yet evolved in-game. */
  plannedEvolution: PlannedEvolution | null;
}

export interface TeamView {
  id: TeamId;
  name: string;
  members: TeamMemberView[];
  isFull: boolean;
}

export function viewTeam(team: Team, data: DataSnapshot, box: BoxEntry[] = []): TeamView {
  return {
    id: team.id,
    name: team.name,
    members: team.members.flatMap((m) => {
      const view = viewTeamMember(m, data, box);
      return view ? [view] : [];
    }),
    isFull: team.members.length >= MAX_TEAM_MEMBERS,
  };
}

/** Undefined when the member's Species is missing from the snapshot (flagged by ticket 10). */
export function viewTeamMember(member: TeamMember, data: DataSnapshot, box: BoxEntry[] = []): TeamMemberView | undefined {
  const species = data.getSpecies(member.speciesId);
  if (!species) return undefined;
  const mega = member.mega ? (findMega(data, member.speciesId, member.mega) ?? null) : null;
  const stats = mega?.stats ?? species.stats;
  const innates = mega?.innates ?? species.innates.map((id) => data.abilityOrPlaceholder(id));
  const activeAbilityId = mega ? mega.ability.id : member.abilityId;
  return {
    member,
    id: member.id,
    species,
    types: mega?.types ?? species.types,
    stats,
    statRoles: statRolesOf(stats),
    innates,
    ability: member.abilityId ? data.abilityOrPlaceholder(member.abilityId) : null,
    mega,
    effectiveAbilityIds: [...innates.map((a) => a.id), ...(activeAbilityId ? [activeAbilityId] : [])],
    moves: member.moves.flatMap((id) => data.getMove(id) ?? []),
    ...boxLinkOf(member, box, data),
  };
}
