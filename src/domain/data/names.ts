import type { RawSpecies } from './raw';

const REGION_ADJECTIVES: Record<string, string> = {
  ALOLA: 'Alolan',
  GALAR: 'Galarian',
  HISUI: 'Hisuian',
  PALDEA: 'Paldean',
};

/**
 * Display names that tell forms apart. Regional forms carry no formLabel in the data,
 * so the form is derived from the constant suffix: SPECIES_VULPIX_ALOLA -> "Vulpix (Alolan)".
 * Only Species whose name is shared get a suffix.
 */
export function buildDisplayNames(species: RawSpecies[]): Map<string, string> {
  const nameCounts = new Map<string, number>();
  for (const s of species) nameCounts.set(s.name, (nameCounts.get(s.name) ?? 0) + 1);

  const result = new Map<string, string>();
  for (const s of species) {
    if (s.formLabel) {
      result.set(s.constant, s.formLabel.includes('(') ? s.formLabel : `${s.name} (${s.formLabel})`);
      continue;
    }
    const form = (nameCounts.get(s.name) ?? 0) > 1 ? formFromConstant(s) : '';
    result.set(s.constant, form ? `${s.name} (${form})` : s.name);
  }
  return result;
}

function formFromConstant(s: RawSpecies): string {
  const target = s.name.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const tokens = s.constant.replace(/^SPECIES_/, '').split('_');
  let consumed = '';
  while (tokens.length > 0 && target.startsWith(consumed + tokens[0]) && consumed !== target) {
    consumed += tokens.shift();
  }
  return tokens
    .map((t) => REGION_ADJECTIVES[t] ?? t.charAt(0) + t.slice(1).toLowerCase())
    .join(' ');
}
