// The 18 battle types (hack constants). None, Mystery and Stellar are ignored (spec).
export const POKEMON_TYPES = [
  'TYPE_NORMAL',
  'TYPE_FIRE',
  'TYPE_WATER',
  'TYPE_ELECTRIC',
  'TYPE_GRASS',
  'TYPE_ICE',
  'TYPE_FIGHTING',
  'TYPE_POISON',
  'TYPE_GROUND',
  'TYPE_FLYING',
  'TYPE_PSYCHIC',
  'TYPE_BUG',
  'TYPE_ROCK',
  'TYPE_GHOST',
  'TYPE_DRAGON',
  'TYPE_DARK',
  'TYPE_STEEL',
  'TYPE_FAIRY',
] as const;

export type PokemonType = (typeof POKEMON_TYPES)[number];

export function isPokemonType(value: string): value is PokemonType {
  return (POKEMON_TYPES as readonly string[]).includes(value);
}

/** "TYPE_FIRE" -> "Fire" */
export function typeName(type: PokemonType): string {
  const word = type.slice('TYPE_'.length);
  return word.charAt(0) + word.slice(1).toLowerCase();
}
