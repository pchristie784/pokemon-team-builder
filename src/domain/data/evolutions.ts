// Planned Evolution options for a Species: every later evolution (all branches, transitively),
// each with short method labels ("Lv 36", "Water Stone", "High Friendship, Day").
//
// - A target reached from the same Species by two methods (Eevee → Leafeon by Ilex Forest or Leaf Stone)
//   is one option whose step lists both methods.
// - Targets that are not selectable Species (Megas, unknown constants) are left out, along with
//   everything after them.
// - EVO_LEVEL_BATTLE_ONLY (Tandemaus → Maushold) is a real, permanent evolution that only triggers on a
//   level-up in battle, not an in-battle form, so it is offered ("Lv 25 in battle, Random 99%").
import type { RawEvolution } from './raw';
import type { Species, SpeciesId } from './model';
import type { DataSnapshot } from './snapshot';

/** One evolution step: the Species evolved into and every method that does it. */
export interface EvolutionStep {
  species: Species;
  methods: string[];
}

/** A later evolution of a Species, with the path to it from that Species. */
export interface PlannedEvolution {
  species: Species;
  /** Steps from the starting Species, in order; the last step's Species is `species`. */
  steps: EvolutionStep[];
  /** One step: its methods ("Lv 14"); several: "via Quilava (Lv 14), then Lv 36". */
  label: string;
}

/** Every later evolution of a Species, depth-first in data order (Quilava, then Typhlosion, ...). */
export function plannedEvolutions(data: DataSnapshot, speciesId: SpeciesId): PlannedEvolution[] {
  const result: PlannedEvolution[] = [];
  const visit = (from: SpeciesId, path: EvolutionStep[], seen: Set<SpeciesId>) => {
    for (const step of directSteps(data, from)) {
      if (seen.has(step.species.id)) continue; // guards against cycles in the data
      const steps = [...path, step];
      result.push({ species: step.species, steps, label: pathLabel(steps) });
      visit(step.species.id, steps, new Set([...seen, step.species.id]));
    }
  };
  visit(speciesId, [], new Set([speciesId]));
  return result;
}

/** True when `target` is the Species itself or one of its Planned Evolutions. */
export function isSameOrLaterEvolution(data: DataSnapshot, speciesId: SpeciesId, target: SpeciesId): boolean {
  return speciesId === target || plannedEvolutions(data, speciesId).some((e) => e.species.id === target);
}

function directSteps(data: DataSnapshot, from: SpeciesId): EvolutionStep[] {
  const evolutions = data.getEvolutions(from);
  const steps = new Map<SpeciesId, EvolutionStep>();
  for (const evolution of evolutions) {
    const species = data.getSpecies(evolution.target);
    if (!species) continue; // a Mega or a constant missing from the snapshot: not a Species
    const method = methodLabel(evolution, evolutions);
    const step = steps.get(species.id);
    if (!step) steps.set(species.id, { species, methods: [method] });
    else if (!step.methods.includes(method)) step.methods.push(method);
  }
  return [...steps.values()];
}

function pathLabel(steps: EvolutionStep[]): string {
  const methods = (step: EvolutionStep) => step.methods.join(' or ');
  if (steps.length === 1) return methods(steps[0]!);
  const via = steps.slice(0, -1).map((step) => `${step.species.displayName} (${methods(step)})`);
  return `via ${via.join(', ')}, then ${methods(steps[steps.length - 1]!)}`;
}

/** A short label for one evolution method; unknown methods fall back to the wiki's own label. */
function methodLabel(evolution: RawEvolution, siblings: RawEvolution[]): string {
  const conditions = evolution.conditions.filter((c): c is string => typeof c === 'string');
  const level = Number(evolution.param);
  const withConditions = (base: string | null) => [base, ...conditions].filter(Boolean).join(', ') || 'Level up';
  switch (evolution.method) {
    case 'EVO_LEVEL':
      return withConditions(level > 0 ? `Lv ${level}` : null);
    case 'EVO_ITEM':
      return withConditions(evolution.itemName || null);
    case 'EVO_LEVEL_BATTLE_ONLY':
      return withConditions(level > 0 ? `Lv ${level} in battle` : 'Level up in battle');
    case 'EVO_SPLIT_FROM_EVO': {
      // Shedinja: appears when Nincada evolves into the species named by `param`.
      const trigger = siblings.find((s) => s.target === evolution.param && s.method !== 'EVO_SPLIT_FROM_EVO');
      return withConditions(`${trigger ? methodLabel(trigger, []) : 'On evolving'} with a free party slot`);
    }
    case 'EVO_BATTLE_END':
      return withConditions('After battle');
    case 'EVO_SCRIPT_TRIGGER':
      return withConditions('Special trigger');
    default:
      return evolution.label;
  }
}
