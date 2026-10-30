// Offensive Coverage: which defending types the Team's chosen damaging moves hit well (GLOSSARY.md).
// Every member's move goes through moveEffectiveness (via effectiveMoveType); ticket 05 extends those two
// with attack-changing abilities from member.effectiveAbilityIds (Mega-aware), via abilityEffects.ts.
// Ticket 12 credits candidate moves with moveCoverage / offensiveCoverage on a hypothetical TeamMemberView.
import type { Move, MoveId } from '../data/model';
import { POKEMON_TYPES, type PokemonType } from '../pokemonTypes';
import type { TeamMemberId } from '../team';
import type { TeamMemberView, TeamView } from '../teamView';
import { offensiveMoveType, offensiveMultiplier } from '../abilityEffects';

/**
 * Damaging moves whose damage ignores type effectiveness' usual scaling (fixed or HP-based damage).
 * The data lists them, and variable-power moves like Return or Grass Knot, with power 1; variable-power
 * moves still count.
 */
export const FIXED_DAMAGE_MOVES: ReadonlySet<MoveId> = new Set([
  'MOVE_SONIC_BOOM', 'MOVE_DRAGON_RAGE', 'MOVE_SEISMIC_TOSS', 'MOVE_NIGHT_SHADE', 'MOVE_PSYWAVE',
  'MOVE_SUPER_FANG', 'MOVE_NATURES_MADNESS', 'MOVE_RUINATION', 'MOVE_ENDEAVOR', 'MOVE_FINAL_GAMBIT',
  'MOVE_COUNTER', 'MOVE_MIRROR_COAT', 'MOVE_METAL_BURST', 'MOVE_COMEUPPANCE', 'MOVE_BIDE',
]);

/** Below this best multiplier a defending type has no super-effective hit. */
export const SUPER_EFFECTIVE = 2;

export interface NoSuperEffectiveHit {
  kind: 'noSuperEffectiveHit';
  type: PokemonType;
}

/** The best the Team can do against `type` is less than neutral (immunities included). */
export interface ReducedDamageOnly {
  kind: 'reducedDamageOnly';
  type: PokemonType;
}

/** A Team Member's move behind a multiplier; `moveType` is the type it hits as (after conversions). */
export interface CoverageSource {
  memberId: TeamMemberId;
  moveId: MoveId;
  moveType: PokemonType;
}

export interface TypeOffense {
  defendType: PokemonType;
  /** Best multiplier any counted move achieves; null when the Team has no counted moves. */
  multiplier: number | null;
  /** Every Team Member and move achieving `multiplier`, in Team order. */
  sources: CoverageSource[];
}

export interface OffensiveCoverage {
  /** One entry per defending type, in POKEMON_TYPES order. */
  byType: TypeOffense[];
  /** Includes the reduced-damage types too. Empty while the Team has no counted moves. */
  typesWithoutSuperEffectiveHit: NoSuperEffectiveHit[];
  typesHitOnlyAtReducedDamage: ReducedDamageOnly[];
}

/** Only physical or special moves with a listed type and power above 0, excluding fixed-damage moves. */
export function countsForCoverage(move: Move): boolean {
  return move.category !== 'status' && move.power > 0 && move.type !== null && !FIXED_DAMAGE_MOVES.has(move.id);
}

/** The type a member's move hits as, after attack-changing abilities. Moves whose type varies use their listed type. */
export function effectiveMoveType(member: TeamMemberView, move: Move): PokemonType | null {
  return move.type === null ? null : offensiveMoveType({ id: move.id, type: move.type }, member.effectiveAbilityIds);
}

/** The multiplier a member's move achieves against a single defending type, after attack-changing abilities. */
export function moveEffectiveness(member: TeamMemberView, move: Move, defendType: PokemonType): number {
  const type = effectiveMoveType(member, move);
  return type === null ? 1 : offensiveMultiplier(type, member.effectiveAbilityIds, [defendType]);
}

/** Multiplier per defending type for one move of a (possibly hypothetical) member; null if it doesn't count. */
export function moveCoverage(member: TeamMemberView, move: Move): Record<PokemonType, number> | null {
  if (!countsForCoverage(move) || effectiveMoveType(member, move) === null) return null;
  return Object.fromEntries(POKEMON_TYPES.map((t) => [t, moveEffectiveness(member, move, t)])) as Record<
    PokemonType,
    number
  >;
}

export function offensiveCoverage(team: Pick<TeamView, 'members'>): OffensiveCoverage {
  const counted = team.members.flatMap((member) =>
    member.moves.flatMap((move) => {
      const byType = moveCoverage(member, move);
      const moveType = effectiveMoveType(member, move);
      return byType && moveType ? [{ source: { memberId: member.id, moveId: move.id, moveType }, byType }] : [];
    }),
  );
  const byType = POKEMON_TYPES.map((defendType): TypeOffense => {
    let multiplier: number | null = null;
    let sources: CoverageSource[] = [];
    for (const { source, byType: m } of counted) {
      const value = m[defendType];
      if (multiplier === null || value > multiplier) {
        multiplier = value;
        sources = [source];
      } else if (value === multiplier) {
        sources.push(source);
      }
    }
    return { defendType, multiplier, sources };
  });
  const flagged = byType.filter((t): t is TypeOffense & { multiplier: number } => t.multiplier !== null);
  return {
    byType,
    typesWithoutSuperEffectiveHit: flagged
      .filter((t) => t.multiplier < SUPER_EFFECTIVE)
      .map((t) => ({ kind: 'noSuperEffectiveHit', type: t.defendType })),
    typesHitOnlyAtReducedDamage: flagged
      .filter((t) => t.multiplier < 1)
      .map((t) => ({ kind: 'reducedDamageOnly', type: t.defendType })),
  };
}
