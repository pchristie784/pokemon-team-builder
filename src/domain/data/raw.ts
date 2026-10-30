// Shapes of the vendored wiki JSON in data/soulgold/ (ADR 0001).
// Only fields the app reads are typed; the files contain more.

export interface RawStats {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export interface RawSpecies {
  id: number;
  constant: string;
  dex: number;
  name: string;
  /** Monotypes are listed twice, e.g. ["TYPE_ICE", "TYPE_ICE"]. */
  types: string[];
  stats: RawStats;
  bst: number;
  abilities: string[];
  regularAbilities: string[];
  hiddenAbilities: string[];
  innates: string[];
  slug: string;
  /** Present on Megas and a few forms (Tatsugiri, Ogerpon); absent on regional forms. */
  formLabel?: string;
  categories: string[];
  sprite: string;
}

export interface RawEvolution {
  method: string;
  param: string | number;
  target: string;
  conditions: unknown[];
  label: string;
  itemName?: string;
}

export interface RawMegaEvolution {
  source: string;
  target: string;
  item: string;
  itemName: string;
  label: string;
}

export interface RawSpeciesMeta {
  dedicatedTutors: Record<string, string>;
  megaEvolutions: RawMegaEvolution[];
  speciesEvolutions: Record<string, RawEvolution[]>;
}

export interface RawMove {
  id: number;
  constant: string;
  name: string;
  description: string;
  power: number;
  accuracy: number;
  pp: number;
  priority: number;
  type: string;
  category: 'DAMAGE_CATEGORY_PHYSICAL' | 'DAMAGE_CATEGORY_SPECIAL' | 'DAMAGE_CATEGORY_STATUS';
}

/** One TM or HM from machines.json. */
export interface RawMachine {
  kind: 'TM' | 'HM';
  number: number;
  move: string;
  /** e.g. "TM04", "HM03". */
  label: string;
}

export interface RawAbility {
  constant: string;
  name: string;
  description: string;
}

export interface RawSpeciesDetails {
  levelUp: { level: number; move: string }[];
  tmhm: string[];
  tutors: string[];
  eggMoves: string[];
  evolutions: RawEvolution[];
}

export interface RawVersion {
  hackVersion: string;
  fetchedAt: string;
  source: string;
}

/** Everything the domain reads, keyed as on disk. */
export interface RawSnapshot {
  version: RawVersion;
  species: RawSpecies[];
  speciesMeta: RawSpeciesMeta;
  moves: Record<string, RawMove>;
  abilities: Record<string, RawAbility>;
  machines: RawMachine[];
  /** Keyed by species slug. */
  speciesDetails: Record<string, RawSpeciesDetails>;
}
