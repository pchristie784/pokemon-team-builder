import { useState } from 'react';
import type { SpeciesId } from '../domain';
import { TypeBadges } from './TypeBadges';
import { useTeamBuilder } from './useTeamBuilder';

const MAX_RESULTS = 12;

interface Props {
  onPick: (speciesId: SpeciesId) => void;
  disabled?: boolean;
  disabledReason?: string;
}

export function SpeciesSearch({ onPick, disabled = false, disabledReason }: Props) {
  const builder = useTeamBuilder();
  const [query, setQuery] = useState('');
  const results = disabled ? [] : builder.searchSpecies(query, MAX_RESULTS);

  return (
    <div className="species-search">
      <input
        type="search"
        placeholder={disabled ? disabledReason : 'Search Species, e.g. "alolan vulpix"'}
        value={query}
        disabled={disabled}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search Species"
      />
      {results.length > 0 && (
        <ul className="search-results">
          {results.map((species) => (
            <li key={species.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(species.id);
                  setQuery('');
                }}
              >
                <span>{species.displayName}</span>
                <TypeBadges types={species.types} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
