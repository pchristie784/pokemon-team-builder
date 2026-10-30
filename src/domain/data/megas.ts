// Megas: the battle-time transformations a Team Member can toggle on (GLOSSARY.md).
//
// Which megaEvolutions targets count as a Mega: those whose form is categorised "mega". In Soulgold that
// includes the *_GMAX forms (the hack repurposes them as Megas: "Mega Evolution (Bugtite)", form label
// "Butterfree Mega") and the Ogerpon Tera forms. Zacian/Zamazenta Crowned are item forms, not Megas, so excluded.
//
// A Mega brings its own typing, base stats, Innates and one ability (Megas list a single ability; the first
// regular ability is used). While toggled on, these replace the base Species' typing, stats, Innates and
// the chosen Ability for the Critique.
import type { Ability, BaseStats, SpeciesId } from './model';
import type { PokemonType } from '../pokemonTypes';
import type { DataSnapshot } from './snapshot';

/** A Mega is identified by its form's species constant, e.g. SPECIES_CHARIZARD_MEGA_X. */
export type MegaId = SpeciesId;

export interface MegaOption {
  id: MegaId;
  /** e.g. "Charizard X", "Venusaur Mega". */
  displayName: string;
  /** The Mega Stone (or other item) that triggers it, e.g. "Dragotite". */
  itemName: string;
  types: PokemonType[];
  stats: BaseStats;
  /** The Mega's ability; replaces the chosen Ability while the Mega is on. */
  ability: Ability;
  /** The Mega's Innates; replace the base Species' Innates while the Mega is on. */
  innates: Ability[];
  sprite: string;
}

export function megaOptions(data: DataSnapshot, speciesId: SpeciesId): MegaOption[] {
  return data
    .getMegaEvolutions(speciesId)
    .filter((m) => m.form.categories.includes('mega'))
    .map(({ form, itemName }) => {
      const abilityId = form.regularAbilities[0] ?? form.hiddenAbilities[0] ?? 'ABILITY_NONE';
      return {
        id: form.id,
        displayName: form.displayName,
        itemName,
        types: form.types,
        stats: form.stats,
        ability: data.abilityOrPlaceholder(abilityId),
        innates: form.innates.map((id) => data.abilityOrPlaceholder(id)),
        sprite: form.sprite,
      };
    });
}

export function findMega(data: DataSnapshot, speciesId: SpeciesId, megaId: MegaId): MegaOption | undefined {
  return megaOptions(data, speciesId).find((m) => m.id === megaId);
}
