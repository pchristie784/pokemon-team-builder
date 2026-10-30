// Read models for the UI: a Team with its members' Species data resolved.
// Ticket 03 (chosen Ability), 06 (Stat Roles) and 07 (Mega) extend TeamMemberView here.
import type { Ability, Species } from './data/model';
import type { DataSnapshot } from './data/snapshot';
import type { PokemonType } from './pokemonTypes';
import { MAX_TEAM_MEMBERS, type Team, type TeamId, type TeamMember } from './team';

export interface TeamMemberView {
  member: TeamMember;
  id: TeamMember['id'];
  species: Species;
  /** Effective typing (the Species' typing until Mega lands in ticket 07). */
  types: PokemonType[];
  innates: Ability[];
}

export interface TeamView {
  id: TeamId;
  name: string;
  members: TeamMemberView[];
  isFull: boolean;
}

export function viewTeam(team: Team, data: DataSnapshot): TeamView {
  return {
    id: team.id,
    name: team.name,
    members: team.members.flatMap((m) => {
      const view = viewTeamMember(m, data);
      return view ? [view] : [];
    }),
    isFull: team.members.length >= MAX_TEAM_MEMBERS,
  };
}

/** Undefined when the member's Species is missing from the snapshot (flagged by ticket 10). */
export function viewTeamMember(member: TeamMember, data: DataSnapshot): TeamMemberView | undefined {
  const species = data.getSpecies(member.speciesId);
  if (!species) return undefined;
  return {
    member,
    id: member.id,
    species,
    types: species.types,
    innates: species.innates.map(
      (id) => data.getAbility(id) ?? { id, name: id, description: '' },
    ),
  };
}
