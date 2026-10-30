import { useMemo, useState } from 'react';
import { isDomainError, typeName, type Suggestion, type TeamId } from '../domain';
import { Sprite } from './Sprite';
import { TypeBadges } from './TypeBadges';
import { useTeamBuilder } from './useTeamBuilder';

/** Ranked Suggestions for one Team, each with its reason, proposed moves and a one-action Add or Replace. */
export function SuggestionsPanel({ teamId }: { teamId: TeamId }) {
  const builder = useTeamBuilder();
  const state = builder.getState();
  const [error, setError] = useState<string | null>(null);
  // Suggesting evaluates thousands of hypothetical Teams in Dex Mode: recompute only when AppState changes.
  const suggestions = useMemo(() => builder.suggest(teamId), [builder, teamId, state]);
  const team = builder.getTeam(teamId);

  const apply = (suggestion: Suggestion) => {
    try {
      builder.applySuggestion(teamId, suggestion);
      setError(null);
    } catch (e) {
      if (!isDomainError(e)) throw e;
      setError(e.message);
    }
  };

  return (
    <section className="suggestions-panel">
      <h2>
        Suggestions <span className="muted">({builder.getMode() === 'BOX' ? 'from your Box' : 'from every Species'})</span>
      </h2>
      {error && <p className="suggestion-error">{error}</p>}
      {team.members.length === 0 ? (
        <p className="muted">Add Team Members to get Suggestions.</p>
      ) : suggestions.length === 0 ? (
        <p className="muted">No candidate fixes any of this Team's problems.</p>
      ) : (
        <ol className="suggestions">
          {suggestions.map((s) => (
            <li key={`${s.species.id}:${s.action.kind === 'replace' ? s.action.memberId : 'fill'}`} className="suggestion">
              <div className="suggestion-main">
                <Sprite sprite={s.species.sprite} name="" />
                <strong>{s.species.displayName}</strong>
                <TypeBadges types={s.species.types} />
                {s.plannedEvolution && <span className="muted">Planned Evolution ({s.plannedEvolution.label})</span>}
                <button type="button" className="suggestion-apply" onClick={() => apply(s)}>
                  {s.action.kind === 'replace' ? `Replace ${s.action.species.displayName}` : 'Add'}
                </button>
              </div>
              <p className="suggestion-reason">{s.reason}</p>
              {s.proposedMoves.length > 0 && (
                <ul className="suggestion-moves">
                  {s.proposedMoves.map((m) => (
                    <li key={m.move.id}>
                      <strong>{m.move.name}</strong> <TypeBadges types={[m.moveType]} />
                      {m.aboveBoxEntryLevel && <span className="muted"> (above its level)</span>}{' '}
                      <span className="muted">covers {[...new Set(m.fixes.map((p) => ('type' in p ? typeName(p.type) : '')))].join(', ')}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
