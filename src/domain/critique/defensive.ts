// Defensive Coverage: how the Team takes hits from each attacking type (GLOSSARY.md).
// memberDefensiveMultiplier applies Innates and the chosen Ability (abilityEffects.ts); everything else builds on it.
import { POKEMON_TYPES, type PokemonType } from '../pokemonTypes';
import type { TeamMemberId } from '../team';
import type { TeamMemberView, TeamView } from '../teamView';
import { defensiveMultiplier } from '../abilityEffects';

/** Three or more Team Members are weak to `type`. */
export const STACKED_WEAKNESS_MIN_MEMBERS = 3;

export interface StackedWeakness {
  kind: 'stackedWeakness';
  type: PokemonType;
}

/** One or more Team Members are weak to `type`, and none resists it or is immune. */
export interface UnansweredType {
  kind: 'unansweredType';
  type: PokemonType;
}

/** A Team Member taking 4× (or more) from `type`; reported on its own, counted once in the rules above. */
export interface QuadWeakness {
  kind: 'quadWeakness';
  memberId: TeamMemberId;
  type: PokemonType;
}

/** One attacking type's effect on the Team; each member appears in at most one list. */
export interface TypeDefense {
  attackType: PokemonType;
  /** Members taking 2× or more (a 4× weakness counts here once). */
  weak: TeamMemberId[];
  /** Members taking more than 0× but less than 1×. */
  resist: TeamMemberId[];
  immune: TeamMemberId[];
}

export interface DefensiveCoverage {
  /** One entry per attacking type, in POKEMON_TYPES order. */
  byType: TypeDefense[];
  stackedWeaknesses: StackedWeakness[];
  unansweredTypes: UnansweredType[];
  quadWeaknesses: QuadWeakness[];
}

/** The multiplier a Team Member takes from an attacking type. The single place defensive modifiers apply. */
export function memberDefensiveMultiplier(member: TeamMemberView, attackType: PokemonType): number {
  return defensiveMultiplier(member.types, member.effectiveAbilityIds, attackType);
}

/** `multiplier` lets Suggestions pass a memoised memberDefensiveMultiplier when evaluating many hypothetical Teams. */
export function defensiveCoverage(
  team: Pick<TeamView, 'members'>,
  multiplier: (member: TeamMemberView, attackType: PokemonType) => number = memberDefensiveMultiplier,
): DefensiveCoverage {
  const quadWeaknesses: QuadWeakness[] = [];
  const byType = POKEMON_TYPES.map((attackType): TypeDefense => {
    const entry: TypeDefense = { attackType, weak: [], resist: [], immune: [] };
    for (const member of team.members) {
      const taken = multiplier(member, attackType);
      if (taken === 0) entry.immune.push(member.id);
      else if (taken < 1) entry.resist.push(member.id);
      else if (taken > 1) entry.weak.push(member.id);
      if (taken >= 4) quadWeaknesses.push({ kind: 'quadWeakness', memberId: member.id, type: attackType });
    }
    return entry;
  });
  return {
    byType,
    stackedWeaknesses: byType
      .filter((t) => t.weak.length >= STACKED_WEAKNESS_MIN_MEMBERS)
      .map((t) => ({ kind: 'stackedWeakness', type: t.attackType })),
    unansweredTypes: byType
      .filter((t) => t.weak.length > 0 && t.resist.length === 0 && t.immune.length === 0)
      .map((t) => ({ kind: 'unansweredType', type: t.attackType })),
    quadWeaknesses,
  };
}
