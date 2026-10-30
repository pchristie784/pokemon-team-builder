import type {
  RawAbility,
  RawMachine,
  RawMove,
  RawSnapshot,
  RawSpecies,
  RawSpeciesDetails,
  RawSpeciesMeta,
  RawVersion,
} from './raw';
import { DataSnapshot } from './snapshot';
import version from '../../../data/soulgold/version.json';
import species from '../../../data/soulgold/species.json';
import speciesMeta from '../../../data/soulgold/species-meta.json';
import moves from '../../../data/soulgold/moves.json';
import abilities from '../../../data/soulgold/abilities.json';
import machines from '../../../data/soulgold/machines.json';

// encounters.json and trainers.json are vendored but not bundled
// until a ticket needs them (trainers: v2 Boss Checks).

const detailModules = import.meta.glob<RawSpeciesDetails>(
  '../../../data/soulgold/species-details/*.json',
  { eager: true, import: 'default' },
);

let cached: DataSnapshot | undefined;

/** The vendored Soulgold data snapshot. Works under Vite and Vitest; built once per process. */
export function loadSnapshot(): DataSnapshot {
  cached ??= new DataSnapshot(readRaw());
  return cached;
}

function readRaw(): RawSnapshot {
  const speciesDetails: Record<string, RawSpeciesDetails> = {};
  for (const [path, details] of Object.entries(detailModules)) {
    const slug = path.slice(path.lastIndexOf('/') + 1, -'.json'.length);
    speciesDetails[slug] = details;
  }
  return {
    version: version as RawVersion,
    species: species as unknown as RawSpecies[],
    speciesMeta: speciesMeta as unknown as RawSpeciesMeta,
    moves: moves as unknown as Record<string, RawMove>,
    abilities: abilities as unknown as Record<string, RawAbility>,
    machines: machines as unknown as RawMachine[],
    speciesDetails,
  };
}
