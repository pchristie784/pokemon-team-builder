// The Critique of a Team (GLOSSARY.md). Each ticket adds its section here: 04 Offensive Coverage, 06 Stat Roles.
import type { TeamView } from '../teamView';
import { defensiveCoverage, type DefensiveCoverage, type StackedWeakness, type UnansweredType } from './defensive';
import { offensiveCoverage, type NoSuperEffectiveHit, type OffensiveCoverage, type ReducedDamageOnly } from './offensive';
import { statRoles, type StatRoleProblem, type StatRoles } from './statRoles';

/**
 * A Critique problem as a plain, comparable value, so Suggestions can diff Critiques to count problems fixed.
 * Later sections add their own kinds to this union.
 */
export type CritiqueProblem = StackedWeakness | UnansweredType | NoSuperEffectiveHit | ReducedDamageOnly | StatRoleProblem;

export interface Critique {
  defensiveCoverage: DefensiveCoverage;
  offensiveCoverage: OffensiveCoverage;
  statRoles: StatRoles;
  /** Every problem across the sections, in section order. */
  problems: CritiqueProblem[];
}

export function critique(team: TeamView): Critique {
  const defensive = defensiveCoverage(team);
  const offensive = offensiveCoverage(team);
  const roles = statRoles(team);
  return {
    defensiveCoverage: defensive,
    offensiveCoverage: offensive,
    statRoles: roles,
    problems: [
      ...defensive.stackedWeaknesses,
      ...defensive.unansweredTypes,
      ...offensive.typesWithoutSuperEffectiveHit,
      ...offensive.typesHitOnlyAtReducedDamage,
      ...roles.flags,
    ],
  };
}
