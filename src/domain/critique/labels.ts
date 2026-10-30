// Display labels for Critique problems, so the Critique panel and Suggestion reasons word them the same way.
import { typeName } from '../pokemonTypes';
import type { CritiqueProblem } from './index';

/** A Critique problem in words, e.g. "Fire Stacked Weakness"; shared by the Critique panel and Suggestion reasons. */
export function problemLabel(problem: CritiqueProblem): string {
  switch (problem.kind) {
    case 'stackedWeakness':
      return `${typeName(problem.type)} Stacked Weakness`;
    case 'unansweredType':
      return `${typeName(problem.type)} Unanswered Type`;
    case 'noSuperEffectiveHit':
      return `no super-effective hit on ${typeName(problem.type)}`;
    case 'reducedDamageOnly':
      return `only reduced damage on ${typeName(problem.type)}`;
    case 'allPhysical':
      return 'all physical attackers';
    case 'allSpecial':
      return 'all special attackers';
    case 'noFastMember':
      return 'no Fast member';
  }
}
