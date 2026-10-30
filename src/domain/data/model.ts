// Public, parsed shapes of snapshot data. Identifiers are the hack's constants (ADR 0001).
import type { PokemonType } from '../pokemonTypes';
import type { RawStats } from './raw';

export type SpeciesId = string; // SPECIES_*
export type MoveId = string; // MOVE_*
export type AbilityId = string; // ABILITY_*

export type BaseStats = RawStats;

/** One selectable Species (regional forms included, Megas excluded). See GLOSSARY.md. */
export interface Species {
  id: SpeciesId;
  /** Shared by forms, e.g. "Vulpix" for both Vulpix and Alolan Vulpix. */
  name: string;
  /** Unique, human-facing, e.g. "Vulpix (Alolan)". */
  displayName: string;
  /** The hack's custom regional dex number, not National Dex. */
  dex: number;
  /** One or two types, deduplicated. */
  types: PokemonType[];
  stats: BaseStats;
  regularAbilities: AbilityId[];
  hiddenAbilities: AbilityId[];
  innates: AbilityId[];
  categories: string[];
  sprite: string;
}

export interface Ability {
  id: AbilityId;
  name: string;
  description: string;
}

export type MoveCategory = 'physical' | 'special' | 'status';

export interface Move {
  id: MoveId;
  name: string;
  description: string;
  /** Listed type; may be absent/unknown for a few typeless moves. */
  type: PokemonType | null;
  category: MoveCategory;
  power: number;
  accuracy: number;
  pp: number;
  priority: number;
}

export interface DataVersion {
  hackVersion: string;
  fetchedAt: string;
}
