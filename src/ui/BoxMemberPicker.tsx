import { useState } from 'react';
import { MAX_TEAM_MEMBERS, type TeamId } from '../domain';
import { Sprite } from './Sprite';
import { TypeBadges } from './TypeBadges';
import { useTeamBuilder } from './useTeamBuilder';

/** Box Mode member picker: the Box Entries and their Planned Evolutions, each with its method label. */
export function BoxMemberPicker({ teamId, disabled }: { teamId: TeamId; disabled: boolean }) {
  const builder = useTeamBuilder();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const box = builder.getBox();
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const candidates = builder
    .getBoxCandidates()
    .filter((c) => words.every((w) => c.species.displayName.toLowerCase().includes(w)));
  const levelOf = (boxEntryId: string) => box.find((e) => e.id === boxEntryId)?.level ?? null;
  // A Box Entry backs at most one Team Member per Team.
  const used = new Set(builder.getTeam(teamId).members.flatMap((m) => (m.boxEntry ? [m.boxEntry.id] : [])));

  if (box.length === 0) {
    return <p className="muted box-member-picker">Box Mode: add Box Entries to the Box to choose Team Members.</p>;
  }
  return (
    <div className="species-search box-member-picker">
      <input
        type="search"
        placeholder={disabled ? `A Team has at most ${MAX_TEAM_MEMBERS} Team Members` : 'Pick from your Box (Box Mode)'}
        value={query}
        disabled={disabled}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-label="Pick a Team Member from the Box"
      />
      {!disabled && (focused || query.length > 0) && (
        <ul className="search-results">
          {candidates.map((c) => {
            const level = levelOf(c.boxEntryId);
            const inUse = used.has(c.boxEntryId);
            return (
              <li key={`${c.boxEntryId}-${c.species.id}`}>
                <button
                  type="button"
                  disabled={inUse}
                  title={inUse ? 'This Box Entry is already a Team Member of this Team' : undefined}
                  onMouseDown={(e) => e.preventDefault()} // keep focus so the list stays open until the pick
                  onClick={() => {
                    builder.addTeamMember(teamId, c.species.id, c.boxEntryId);
                    setQuery('');
                  }}
                >
                  <span className="with-sprite">
                    <Sprite sprite={c.species.sprite} name="" />
                    {c.species.displayName}{' '}
                    {c.plannedEvolution ? (
                      <span className="planned-marker" title="Planned Evolution">
                        Planned: {c.plannedEvolution.label}
                      </span>
                    ) : (
                      <span className="muted">Box Entry{level !== null ? `, Lv ${level}` : ''}</span>
                    )}
                    {inUse && <span className="muted"> (already on this Team)</span>}
                  </span>
                  <TypeBadges types={c.species.types} />
                </button>
              </li>
            );
          })}
          {candidates.length === 0 && <li className="muted">Nothing in the Box matches.</li>}
        </ul>
      )}
    </div>
  );
}
