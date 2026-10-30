// The standard Gen 6+ 18-type chart (checked unchanged against src/data/types_info.h in Eemeliri/soulgold;
// recheck when refreshing the data). Pure and reusable: Defensive/Offensive Coverage and Boss Checks use it.
import type { PokemonType } from './pokemonTypes';

type Row = Partial<Record<PokemonType, number>>;

/** attacking type -> defending type -> multiplier; missing entries are neutral (1×). */
const CHART: Record<PokemonType, Row> = {
  TYPE_NORMAL: { TYPE_ROCK: 0.5, TYPE_GHOST: 0, TYPE_STEEL: 0.5 },
  TYPE_FIRE: {
    TYPE_FIRE: 0.5, TYPE_WATER: 0.5, TYPE_GRASS: 2, TYPE_ICE: 2, TYPE_BUG: 2, TYPE_ROCK: 0.5, TYPE_DRAGON: 0.5,
    TYPE_STEEL: 2,
  },
  TYPE_WATER: { TYPE_FIRE: 2, TYPE_WATER: 0.5, TYPE_GRASS: 0.5, TYPE_GROUND: 2, TYPE_ROCK: 2, TYPE_DRAGON: 0.5 },
  TYPE_ELECTRIC: {
    TYPE_WATER: 2, TYPE_ELECTRIC: 0.5, TYPE_GRASS: 0.5, TYPE_GROUND: 0, TYPE_FLYING: 2, TYPE_DRAGON: 0.5,
  },
  TYPE_GRASS: {
    TYPE_FIRE: 0.5, TYPE_WATER: 2, TYPE_GRASS: 0.5, TYPE_POISON: 0.5, TYPE_GROUND: 2, TYPE_FLYING: 0.5,
    TYPE_BUG: 0.5, TYPE_ROCK: 2, TYPE_DRAGON: 0.5, TYPE_STEEL: 0.5,
  },
  TYPE_ICE: {
    TYPE_FIRE: 0.5, TYPE_WATER: 0.5, TYPE_GRASS: 2, TYPE_ICE: 0.5, TYPE_GROUND: 2, TYPE_FLYING: 2, TYPE_DRAGON: 2,
    TYPE_STEEL: 0.5,
  },
  TYPE_FIGHTING: {
    TYPE_NORMAL: 2, TYPE_ICE: 2, TYPE_POISON: 0.5, TYPE_FLYING: 0.5, TYPE_PSYCHIC: 0.5, TYPE_BUG: 0.5,
    TYPE_ROCK: 2, TYPE_GHOST: 0, TYPE_DARK: 2, TYPE_STEEL: 2, TYPE_FAIRY: 0.5,
  },
  TYPE_POISON: {
    TYPE_GRASS: 2, TYPE_POISON: 0.5, TYPE_GROUND: 0.5, TYPE_ROCK: 0.5, TYPE_GHOST: 0.5, TYPE_STEEL: 0,
    TYPE_FAIRY: 2,
  },
  TYPE_GROUND: {
    TYPE_FIRE: 2, TYPE_ELECTRIC: 2, TYPE_GRASS: 0.5, TYPE_POISON: 2, TYPE_FLYING: 0, TYPE_BUG: 0.5, TYPE_ROCK: 2,
    TYPE_STEEL: 2,
  },
  TYPE_FLYING: {
    TYPE_ELECTRIC: 0.5, TYPE_GRASS: 2, TYPE_FIGHTING: 2, TYPE_BUG: 2, TYPE_ROCK: 0.5, TYPE_STEEL: 0.5,
  },
  TYPE_PSYCHIC: { TYPE_FIGHTING: 2, TYPE_POISON: 2, TYPE_PSYCHIC: 0.5, TYPE_DARK: 0, TYPE_STEEL: 0.5 },
  TYPE_BUG: {
    TYPE_FIRE: 0.5, TYPE_GRASS: 2, TYPE_FIGHTING: 0.5, TYPE_POISON: 0.5, TYPE_FLYING: 0.5, TYPE_PSYCHIC: 2,
    TYPE_GHOST: 0.5, TYPE_DARK: 2, TYPE_STEEL: 0.5, TYPE_FAIRY: 0.5,
  },
  TYPE_ROCK: {
    TYPE_FIRE: 2, TYPE_ICE: 2, TYPE_FIGHTING: 0.5, TYPE_GROUND: 0.5, TYPE_FLYING: 2, TYPE_BUG: 2, TYPE_STEEL: 0.5,
  },
  TYPE_GHOST: { TYPE_NORMAL: 0, TYPE_PSYCHIC: 2, TYPE_GHOST: 2, TYPE_DARK: 0.5 },
  TYPE_DRAGON: { TYPE_DRAGON: 2, TYPE_STEEL: 0.5, TYPE_FAIRY: 0 },
  TYPE_DARK: { TYPE_FIGHTING: 0.5, TYPE_PSYCHIC: 2, TYPE_GHOST: 2, TYPE_DARK: 0.5, TYPE_FAIRY: 0.5 },
  TYPE_STEEL: {
    TYPE_FIRE: 0.5, TYPE_WATER: 0.5, TYPE_ELECTRIC: 0.5, TYPE_ICE: 2, TYPE_ROCK: 2, TYPE_STEEL: 0.5, TYPE_FAIRY: 2,
  },
  TYPE_FAIRY: {
    TYPE_FIRE: 0.5, TYPE_FIGHTING: 2, TYPE_POISON: 0.5, TYPE_DRAGON: 2, TYPE_DARK: 2, TYPE_STEEL: 0.5,
  },
};

/** Multiplier of an attacking type against a (one- or two-type) defender: 0, 0.25, 0.5, 1, 2 or 4. */
export function typeEffectiveness(attackType: PokemonType, defenderTypes: readonly PokemonType[]): number {
  const row = CHART[attackType];
  return defenderTypes.reduce((product, defender) => product * (row[defender] ?? 1), 1);
}
