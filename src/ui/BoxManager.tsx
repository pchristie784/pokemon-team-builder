import { useState } from 'react';
import { isDomainError, MAX_LEVEL, MIN_LEVEL, type BoxEntryView } from '../domain';
import { SpeciesSearch } from './SpeciesSearch';
import { Sprite } from './Sprite';
import { TypeBadges } from './TypeBadges';
import { useTeamBuilder } from './useTeamBuilder';

/** The Box: add Box Entries by searching a Species, set levels, change Species after evolving, remove. */
export function BoxManager() {
  const builder = useTeamBuilder();
  const box = builder.getBox();
  return (
    <section className="box-manager">
      <h2>
        Box <span className="muted">({box.length})</span>
      </h2>
      <SpeciesSearch onPick={(speciesId) => builder.addBoxEntry(speciesId)} />
      {box.length === 0 ? (
        <p className="muted">No Box Entries yet. Search a Species to record a catch.</p>
      ) : (
        <ul className="box-entries">
          {box.map((entry) => (
            <li key={entry.id}>
              <BoxEntryRow entry={entry} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function BoxEntryRow({ entry }: { entry: BoxEntryView }) {
  const builder = useTeamBuilder();
  const [changing, setChanging] = useState(false);
  const [levelText, setLevelText] = useState(entry.level?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);

  const commitLevel = () => {
    const text = levelText.trim();
    try {
      builder.setBoxEntryLevel(entry.id, text === '' ? null : Number(text));
      setError(null);
    } catch (e) {
      if (!isDomainError(e)) throw e;
      setError(e.message);
      setLevelText(entry.level?.toString() ?? '');
    }
  };

  return (
    <div className="box-entry">
      <div className="box-entry-main">
        <Sprite sprite={entry.species.sprite} name="" />
        <strong>{entry.species.displayName}</strong>
        <TypeBadges types={entry.species.types} />
        <label className="box-entry-level">
          Lv{' '}
          <input
            type="number"
            min={MIN_LEVEL}
            max={MAX_LEVEL}
            placeholder="?"
            value={levelText}
            onChange={(e) => setLevelText(e.target.value)}
            onBlur={commitLevel}
            onKeyDown={(e) => e.key === 'Enter' && commitLevel()}
            aria-label={`Level of ${entry.species.displayName}`}
          />
        </label>
        <button type="button" className="remove" onClick={() => setChanging(!changing)}>
          {changing ? 'Cancel' : 'Change Species'}
        </button>
        <button
          type="button"
          className="remove"
          onClick={() => builder.removeBoxEntry(entry.id)}
          aria-label={`Remove ${entry.species.displayName} from the Box`}
        >
          Remove
        </button>
      </div>
      {changing && (
        <SpeciesSearch
          onPick={(speciesId) => {
            builder.setBoxEntrySpecies(entry.id, speciesId);
            setChanging(false);
          }}
        />
      )}
      {entry.plannedEvolutions.length > 0 && (
        <p className="box-entry-evolutions muted">
          Evolves into:{' '}
          {entry.plannedEvolutions.map((e) => `${e.species.displayName} (${e.label})`).join('; ')}
        </p>
      )}
      {error && <p className="flag flag-bad">{error}</p>}
    </div>
  );
}
