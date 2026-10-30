// The hand-curated ability effects table: the type-matchup effects of Innates and Abilities.
// Pure and reusable: Defensive Coverage (ticket 03), Offensive Coverage (ticket 05) and v2 Boss Checks.
// Abilities not in the table have no effect on type matchups. Conditional effects (weather, HP, contact,
// physical/special, sound, wind) are deliberately left out.
//
// Offensive side (ticket 05): offensiveMoveType (move type conversion) and offensiveMultiplier (matchup
// changes such as Scrappy, Acidic, Omega, Tinted Lens), pure over move type, ability ids and defender types.
import type { AbilityId, MoveId } from './data/model';
import { POKEMON_TYPES, type PokemonType } from './pokemonTypes';
import { typeEffectiveness } from './typeChart';

export interface AbilityEffect {
  // --- Defensive ---
  /** Extra types the holder gains for defence (Soulgold's "Soul" abilities). */
  addedTypes?: PokemonType[];
  /** Weaknesses and resistances are reversed; immunities stay (Inversion). */
  invertsEffectiveness?: boolean;
  /** Attacks of these types deal no damage (Levitate, absorbing abilities). */
  immuneTo?: PokemonType[];
  /** Only super effective attacks deal damage (Wonder Guard). */
  onlySuperEffectiveHits?: boolean;
  /** Every non-immune hit is not very effective, 0.5× (Omega). */
  allHitsResisted?: boolean;
  /** Damage-taken multipliers by attacking type, applied after effectiveness (Thick Fat: Fire/Ice 0.5). */
  damageTaken?: Partial<Record<PokemonType, number>>;

  // --- Offensive ---
  /** The holder's sound-based moves (SOUND_MOVES) become this type (Liquid Voice). */
  soundMovesBecome?: PokemonType;
  /** The holder's Normal-type moves become this type (Pixilate and the rest of the "-ate" family). */
  normalMovesBecome?: PokemonType;
  /** Moves of these types hit Ghost types (Scrappy, Mind's Eye): Ghost's immunity counts as neutral. */
  hitsGhostWith?: PokemonType[];
  /** Resisted hits (more than 0×, less than 1×) count as neutral; immunities stay (Tinted Lens, per the spec). */
  resistedHitsNeutral?: boolean;
  /** Attacks of the key type are super effective (2×) against these defending types (Acidic: Poison vs Steel). */
  superEffectiveAgainst?: Partial<Record<PokemonType, PokemonType[]>>;
  /** Every non-immune hit the holder deals is super effective, 2× (Omega). */
  allHitsSuperEffective?: boolean;
}

const halves = (...types: PokemonType[]) => Object.fromEntries(types.map((t) => [t, 0.5]));

/** Types a Steel type resists (for Valkyrie). */
const STEEL_RESISTS = POKEMON_TYPES.filter((t) => typeEffectiveness(t, ['TYPE_STEEL']) === 0.5);
/** Types a Dragon type resists (for Like a Dragon). */
const DRAGON_RESISTS = POKEMON_TYPES.filter((t) => typeEffectiveness(t, ['TYPE_DRAGON']) === 0.5);

/**
 * Damaging sound-based moves: those moves.json lists as boosted by Punk Rock (the data has no sound flag).
 * Status sound moves are left out; they never count for Offensive Coverage.
 */
export const SOUND_MOVES: ReadonlySet<MoveId> = new Set([
  'MOVE_SNORE', 'MOVE_UPROAR', 'MOVE_HYPER_VOICE', 'MOVE_BUG_BUZZ', 'MOVE_CHATTER', 'MOVE_ROUND',
  'MOVE_ECHOED_VOICE', 'MOVE_RELIC_SONG', 'MOVE_SNARL', 'MOVE_DISARMING_VOICE', 'MOVE_BOOMBURST',
  'MOVE_SPARKLING_ARIA', 'MOVE_CLANGING_SCALES', 'MOVE_DRUM_BEATING', 'MOVE_OVERDRIVE', 'MOVE_EERIE_SPELL',
  'MOVE_TORCH_SONG', 'MOVE_ALLURING_VOICE', 'MOVE_PSYCHIC_NOISE',
]);

const soul = (type: PokemonType): AbilityEffect => ({ addedTypes: [type] });
const ate = (type: PokemonType): AbilityEffect => ({ normalMovesBecome: type });

export const ABILITY_EFFECTS: Readonly<Record<AbilityId, AbilityEffect>> = {
  // Immunities (standard)
  ABILITY_LEVITATE: { immuneTo: ['TYPE_GROUND'] },
  ABILITY_EARTH_EATER: { immuneTo: ['TYPE_GROUND'] },
  ABILITY_FLASH_FIRE: { immuneTo: ['TYPE_FIRE'] },
  ABILITY_WELL_BAKED_BODY: { immuneTo: ['TYPE_FIRE'] },
  ABILITY_WATER_ABSORB: { immuneTo: ['TYPE_WATER'] },
  ABILITY_STORM_DRAIN: { immuneTo: ['TYPE_WATER'] },
  ABILITY_DRY_SKIN: { immuneTo: ['TYPE_WATER'], damageTaken: { TYPE_FIRE: 1.25 } },
  ABILITY_VOLT_ABSORB: { immuneTo: ['TYPE_ELECTRIC'] },
  ABILITY_LIGHTNING_ROD: { immuneTo: ['TYPE_ELECTRIC'] },
  ABILITY_MOTOR_DRIVE: { immuneTo: ['TYPE_ELECTRIC'] },
  ABILITY_SAP_SIPPER: { immuneTo: ['TYPE_GRASS'] },
  ABILITY_WONDER_GUARD: { onlySuperEffectiveHits: true },

  // Damage multipliers (standard)
  ABILITY_THICK_FAT: { damageTaken: halves('TYPE_FIRE', 'TYPE_ICE') },
  ABILITY_HEATPROOF: { damageTaken: halves('TYPE_FIRE') },
  ABILITY_WATER_BUBBLE: { damageTaken: halves('TYPE_FIRE') },
  ABILITY_PURIFYING_SALT: { damageTaken: halves('TYPE_GHOST') },
  ABILITY_FLUFFY: { damageTaken: { TYPE_FIRE: 2 } },

  // Soulgold-specific (from the review of data/soulgold/abilities.json)
  ABILITY_EELEVATE: { immuneTo: ['TYPE_GROUND'] },
  ABILITY_MIND_FLOAT: { immuneTo: ['TYPE_GROUND'] },
  ABILITY_ELECTROLEVITATE: { immuneTo: ['TYPE_GROUND'] },
  ABILITY_ALLSEEING_IDOL: { immuneTo: ['TYPE_GROUND'] },
  ABILITY_SMOULDERING: { immuneTo: ['TYPE_WATER'] },
  ABILITY_RITUAL: { immuneTo: ['TYPE_GHOST'] },
  ABILITY_VALKYRIE: { immuneTo: ['TYPE_POISON'], damageTaken: halves(...STEEL_RESISTS) },
  ABILITY_LIKE_A_DRAGON: { damageTaken: halves(...DRAGON_RESISTS) },
  ABILITY_INVERSION: { invertsEffectiveness: true },
  ABILITY_OMEGA: { allHitsResisted: true, allHitsSuperEffective: true },
  ABILITY_PLAIN_SOUL: soul('TYPE_NORMAL'),
  ABILITY_FIGHTER_SOUL: soul('TYPE_FIGHTING'),
  ABILITY_WIND_SOUL: soul('TYPE_FLYING'),
  ABILITY_VENOM_SOUL: soul('TYPE_POISON'),
  ABILITY_EARTH_SOUL: soul('TYPE_GROUND'),
  ABILITY_STONE_SOUL: soul('TYPE_ROCK'),
  ABILITY_HIVE_SOUL: soul('TYPE_BUG'),
  ABILITY_PHANTOM_SOUL: soul('TYPE_GHOST'),
  ABILITY_STEEL_SOUL: soul('TYPE_STEEL'),
  ABILITY_FLAME_SOUL: soul('TYPE_FIRE'),
  ABILITY_SEA_SOUL: soul('TYPE_WATER'),
  ABILITY_VERDANT_SOUL_TYPE: soul('TYPE_GRASS'),
  ABILITY_THUNDER_SOUL: soul('TYPE_ELECTRIC'),
  ABILITY_MIND_SOUL: soul('TYPE_PSYCHIC'),
  ABILITY_FROST_SOUL: soul('TYPE_ICE'),
  ABILITY_DRAGON_SOUL: soul('TYPE_DRAGON'),
  ABILITY_NIGHT_SOUL: soul('TYPE_DARK'),
  ABILITY_FAE_SOUL: soul('TYPE_FAIRY'),

  // --- Offensive ---
  // Move type conversion (standard)
  ABILITY_LIQUID_VOICE: { soundMovesBecome: 'TYPE_WATER' },
  ABILITY_PIXILATE: ate('TYPE_FAIRY'),
  ABILITY_REFRIGERATE: ate('TYPE_ICE'),
  ABILITY_AERILATE: ate('TYPE_FLYING'),
  ABILITY_GALVANIZE: ate('TYPE_ELECTRIC'),
  // Normal-move conversion (Soulgold-specific)
  ABILITY_FIGHTING_ATE: ate('TYPE_FIGHTING'),
  ABILITY_POISON_ATE: ate('TYPE_POISON'),
  ABILITY_GROUND_ATE: ate('TYPE_GROUND'),
  ABILITY_ROCK_ATE: ate('TYPE_ROCK'),
  ABILITY_BUG_ATE: ate('TYPE_BUG'),
  ABILITY_GHOST_ATE: ate('TYPE_GHOST'),
  ABILITY_STEEL_ATE: ate('TYPE_STEEL'),
  ABILITY_FIRE_ATE: ate('TYPE_FIRE'),
  ABILITY_WATER_ATE: ate('TYPE_WATER'),
  ABILITY_GRASS_ATE: ate('TYPE_GRASS'),
  ABILITY_PSYCHIC_ATE: ate('TYPE_PSYCHIC'),
  ABILITY_DRAGON_ATE: ate('TYPE_DRAGON'),
  ABILITY_DRAGONIZE: ate('TYPE_DRAGON'),
  ABILITY_DARK_ATE: ate('TYPE_DARK'),
  // Hitting Ghost
  ABILITY_SCRAPPY: { hitsGhostWith: ['TYPE_NORMAL', 'TYPE_FIGHTING'] },
  ABILITY_MINDS_EYE: { hitsGhostWith: ['TYPE_NORMAL', 'TYPE_FIGHTING'] },
  // Resisted hits
  ABILITY_TINTED_LENS: { resistedHitsNeutral: true },
  // Soulgold-specific matchup changes
  ABILITY_ACIDIC: { superEffectiveAgainst: { TYPE_POISON: ['TYPE_STEEL'] } },
};

function effectsOf(abilityIds: readonly AbilityId[]): AbilityEffect[] {
  return [...new Set(abilityIds)].flatMap((id) => ABILITY_EFFECTS[id] ?? []);
}

/**
 * The multiplier a Pokémon with `types` and the given Innates/Ability takes from `attackType`.
 * Each ability counts once even if listed twice (e.g. an Innate that is also the chosen Ability).
 */
export function defensiveMultiplier(
  types: readonly PokemonType[],
  abilityIds: readonly AbilityId[],
  attackType: PokemonType,
): number {
  const effects = effectsOf(abilityIds);
  const allTypes = [...new Set([...types, ...effects.flatMap((e) => e.addedTypes ?? [])])];
  let multiplier = typeEffectiveness(attackType, allTypes);
  if (multiplier !== 0 && effects.some((e) => e.invertsEffectiveness)) multiplier = 1 / multiplier;
  if (effects.some((e) => e.immuneTo?.includes(attackType))) return 0;
  if (multiplier <= 1 && effects.some((e) => e.onlySuperEffectiveHits)) return 0;
  if (multiplier !== 0 && effects.some((e) => e.allHitsResisted)) multiplier = 0.5;
  for (const effect of effects) multiplier *= effect.damageTaken?.[attackType] ?? 1;
  return multiplier;
}

/**
 * The type a move hits as when used by a Pokémon with the given Innates/Ability: sound moves first
 * (Liquid Voice), then Normal-move conversion (the "-ate" family).
 */
export function offensiveMoveType(
  move: { id: MoveId; type: PokemonType },
  abilityIds: readonly AbilityId[],
): PokemonType {
  const effects = effectsOf(abilityIds);
  const first = <K extends keyof AbilityEffect>(key: K) => effects.find((e) => e[key] !== undefined)?.[key];
  let type = (SOUND_MOVES.has(move.id) && first('soundMovesBecome')) || move.type;
  if (type === 'TYPE_NORMAL') type = first('normalMovesBecome') ?? type;
  return type;
}

/**
 * The multiplier an attack of `attackType` (already converted by offensiveMoveType) achieves against
 * `defenderTypes` when used by a Pokémon with the given Innates/Ability. Defender abilities are not considered.
 */
export function offensiveMultiplier(
  attackType: PokemonType,
  abilityIds: readonly AbilityId[],
  defenderTypes: readonly PokemonType[],
): number {
  const effects = effectsOf(abilityIds);
  const hitsGhost = effects.some((e) => e.hitsGhostWith?.includes(attackType));
  let multiplier = 1;
  for (const defendType of new Set(defenderTypes)) {
    let factor = typeEffectiveness(attackType, [defendType]);
    if (factor === 0 && defendType === 'TYPE_GHOST' && hitsGhost) factor = 1;
    if (effects.some((e) => e.superEffectiveAgainst?.[attackType]?.includes(defendType))) factor = 2;
    multiplier *= factor;
  }
  if (multiplier !== 0 && effects.some((e) => e.allHitsSuperEffective)) multiplier = 2;
  if (multiplier > 0 && multiplier < 1 && effects.some((e) => e.resistedHitsNeutral)) multiplier = 1;
  return multiplier;
}
