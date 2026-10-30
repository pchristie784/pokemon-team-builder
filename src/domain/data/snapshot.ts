import { isPokemonType, type PokemonType } from '../pokemonTypes';
import type {
  Ability,
  AbilityId,
  DataVersion,
  Move,
  MoveCategory,
  MoveId,
  Species,
  SpeciesId,
} from './model';
import { buildDisplayNames } from './names';
import type {
  RawEvolution,
  RawMegaEvolution,
  RawSnapshot,
  RawSpecies,
  RawSpeciesDetails,
} from './raw';

const MOVE_CATEGORIES: Record<string, MoveCategory> = {
  DAMAGE_CATEGORY_PHYSICAL: 'physical',
  DAMAGE_CATEGORY_SPECIAL: 'special',
  DAMAGE_CATEGORY_STATUS: 'status',
};

/**
 * Parsed, indexed view of the vendored data. Internal to the domain layer:
 * the UI reaches it only through the TeamBuilder facade.
 * Later tickets add lookups here (learnable moves with source labels, Planned
 * Evolution options, Mega forms); prefer a new file in data/ for anything sizeable.
 */
export class DataSnapshot {
  readonly version: DataVersion;
  private readonly species = new Map<SpeciesId, Species>();
  /** Megas and other battle-only forms reachable via megaEvolutions; not Species. */
  private readonly megaForms = new Map<SpeciesId, Species>();
  private readonly slugs = new Map<SpeciesId, string>();
  private readonly searchText = new Map<SpeciesId, string>();

  constructor(private readonly raw: RawSnapshot) {
    this.version = { hackVersion: raw.version.hackVersion, fetchedAt: raw.version.fetchedAt };
    const megaIds = new Set(raw.speciesMeta.megaEvolutions.map((m) => m.target));
    // SPECIES_ZYGARDE_MEGA is categorised "mega" but has no megaEvolutions entry.
    for (const s of raw.species) if (s.categories.includes('mega')) megaIds.add(s.constant);

    const selectable = raw.species.filter((s) => !megaIds.has(s.constant));
    const displayNames = buildDisplayNames(selectable);
    for (const s of raw.species) {
      this.slugs.set(s.constant, s.slug);
      const isMega = megaIds.has(s.constant);
      const parsed = parseSpecies(s, displayNames.get(s.constant) ?? s.formLabel ?? s.name);
      (isMega ? this.megaForms : this.species).set(s.constant, parsed);
      if (!isMega) {
        this.searchText.set(
          s.constant,
          `${parsed.displayName} ${s.constant.replace(/^SPECIES_/, '').replace(/_/g, ' ')}`.toLowerCase(),
        );
      }
    }
  }

  getSpecies(id: SpeciesId): Species | undefined {
    return this.species.get(id);
  }

  allSpecies(): Species[] {
    return [...this.species.values()];
  }

  /** Every whitespace-separated query word must match; name-prefix matches rank first, then dex order. */
  searchSpecies(query: string, limit = Infinity): Species[] {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return [];
    const matches: { species: Species; rank: number }[] = [];
    for (const [id, text] of this.searchText) {
      if (!words.every((w) => text.includes(w))) continue;
      const species = this.species.get(id)!;
      const rank = species.displayName.toLowerCase().startsWith(words[0]!) ? 0 : 1;
      matches.push({ species, rank });
    }
    matches.sort((a, b) => a.rank - b.rank || a.species.dex - b.species.dex);
    return matches.slice(0, limit).map((m) => m.species);
  }

  getAbility(id: AbilityId): Ability | undefined {
    const a = this.raw.abilities[id];
    return a && { id, name: a.name, description: a.description };
  }

  getMove(id: MoveId): Move | undefined {
    const m = this.raw.moves[id];
    if (!m) return undefined;
    return {
      id,
      name: m.name,
      description: m.description,
      type: isPokemonType(m.type) ? m.type : null,
      category: MOVE_CATEGORIES[m.category] ?? 'status',
      power: m.power,
      accuracy: m.accuracy,
      pp: m.pp,
      priority: m.priority,
    };
  }

  /** Raw learnset (level-up, TM/HM, tutor, egg) for a Species or Mega form. */
  getLearnset(id: SpeciesId): Pick<RawSpeciesDetails, 'levelUp' | 'tmhm' | 'tutors' | 'eggMoves'> | undefined {
    const slug = this.slugs.get(id);
    const details = slug === undefined ? undefined : this.raw.speciesDetails[slug];
    return details && {
      levelUp: details.levelUp,
      tmhm: details.tmhm,
      tutors: details.tutors,
      eggMoves: details.eggMoves,
    };
  }

  /** Direct evolutions (one step), each with the wiki's method label. */
  getEvolutions(id: SpeciesId): RawEvolution[] {
    return this.raw.speciesMeta.speciesEvolutions[id] ?? [];
  }

  /** Mega transformations available to a Species. */
  getMegaEvolutions(id: SpeciesId): (RawMegaEvolution & { form: Species })[] {
    return this.raw.speciesMeta.megaEvolutions
      .filter((m) => m.source === id && this.megaForms.has(m.target))
      .map((m) => ({ ...m, form: this.megaForms.get(m.target)! }));
  }
}

function parseSpecies(s: RawSpecies, displayName: string): Species {
  return {
    id: s.constant,
    name: s.name,
    displayName,
    dex: s.dex,
    types: [...new Set(s.types.filter(isPokemonType))] as PokemonType[],
    stats: s.stats,
    regularAbilities: [...new Set(s.regularAbilities)],
    hiddenAbilities: [...new Set(s.hiddenAbilities)],
    innates: s.innates,
    categories: s.categories,
    sprite: s.sprite,
  };
}
