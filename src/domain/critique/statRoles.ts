// Stat Roles section of the Critique (GLOSSARY.md): each Team Member's roles from its effective base stats,
// plus balance flags for the Team as a whole.
import type { BaseStats } from '../data/model';
import type { TeamMemberView, TeamView } from '../teamView';

// --- Thresholds (tune here) ---
// Chosen against the vendored snapshot's 842 non-Mega Species.
/** Fast at this base Speed or more (spec). */
export const FAST_SPEED = 100;
/**
 * Physical or special attacker when Attack and Special Attack differ by at least this much; mixed otherwise.
 * The median |Atk - SpA| gap is 25, so ~40% of Species read as mixed (e.g. Lucario 110/115, Infernape 104/104),
 * while Charizard (84/109) reads special and Crobat (90/70) physical.
 */
export const ATTACKER_GAP = 20;
/**
 * Tank when HP + Defense + Special Defense is at least this. Median is 221, 90th percentile 305:
 * Snorlax (335), Blissey (400), Steelix (340), Tyranitar (310) qualify; Swampert (280) and Skarmory (275) don't.
 */
export const TANK_BULK = 300;
/**
 * Balance flags need at least this many Team Members: with one member "all physical" or "no Fast member" is
 * true by definition and says nothing about the Team's balance.
 */
export const MIN_MEMBERS_FOR_BALANCE_FLAGS = 2;

export type StatRole = 'physicalAttacker' | 'specialAttacker' | 'mixedAttacker' | 'fast' | 'tank';

export interface AllPhysical {
  kind: 'allPhysical';
}
export interface AllSpecial {
  kind: 'allSpecial';
}
export interface NoFastMember {
  kind: 'noFastMember';
}
export type StatRoleProblem = AllPhysical | AllSpecial | NoFastMember;

export interface MemberStatRoles {
  memberId: TeamMemberView['id'];
  /** The attacker role first, then fast and tank when they apply. */
  roles: StatRole[];
}

export interface StatRoles {
  members: MemberStatRoles[];
  flags: StatRoleProblem[];
}

export function statRolesOf(stats: BaseStats): StatRole[] {
  const roles: StatRole[] = [];
  if (stats.atk - stats.spa >= ATTACKER_GAP) roles.push('physicalAttacker');
  else if (stats.spa - stats.atk >= ATTACKER_GAP) roles.push('specialAttacker');
  else roles.push('mixedAttacker');
  if (stats.spe >= FAST_SPEED) roles.push('fast');
  if (stats.hp + stats.def + stats.spd >= TANK_BULK) roles.push('tank');
  return roles;
}

export function statRoles(team: TeamView): StatRoles {
  // Each member view's statRoles come from its effective stats (Mega-aware once ticket 07 lands).
  const members = team.members.map((m) => ({ memberId: m.id, roles: m.statRoles }));
  const flags: StatRoleProblem[] = [];
  if (members.length >= MIN_MEMBERS_FOR_BALANCE_FLAGS) {
    const all = (role: StatRole) => members.every((m) => m.roles.includes(role));
    if (all('physicalAttacker')) flags.push({ kind: 'allPhysical' });
    if (all('specialAttacker')) flags.push({ kind: 'allSpecial' });
    if (!members.some((m) => m.roles.includes('fast'))) flags.push({ kind: 'noFastMember' });
  }
  return { members, flags };
}
