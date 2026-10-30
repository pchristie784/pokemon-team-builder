import { useMemo, useState } from 'react';
import { isDomainError, MAX_MOVES, type Move, type MoveSource, type TeamMemberView } from '../domain';
import { TypeBadges } from './TypeBadges';
import { useTeamBuilder } from './useTeamBuilder';

function sourceLabel(source: MoveSource): string {
  switch (source.kind) {
    case 'levelUp':
      return `Lv ${source.level}`;
    case 'machine':
      return source.label;
    case 'tutor':
      return 'Tutor';
    case 'egg':
      return 'Egg';
  }
}

/** The data lists fixed-damage and variable-power moves with power 1; show those as no fixed power. */
function moveStats(move: Move): string {
  const category = move.category.charAt(0).toUpperCase() + move.category.slice(1);
  return `${category} · ${move.power > 1 ? move.power : '—'} pow · ${move.accuracy > 0 ? `${move.accuracy}%` : '—'}`;
}

/** Up to four moves for a Team Member, chosen from every move its Species can learn. */
export function MovePicker({ member }: { member: TeamMemberView }) {
  const builder = useTeamBuilder();
  const teamId = builder.getTeams().find((t) => t.members.some((m) => m.id === member.id))?.id ?? '';
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const boxLevel = member.boxEntry?.level ?? null;
  const learnable = useMemo(() => builder.getTeamMemberLearnableMoves(teamId, member.id), [builder, teamId, member.id, member.species.id, boxLevel]);
  const chosen = new Set(member.member.moves);
  const full = member.member.moves.length >= MAX_MOVES;
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = learnable.filter(
    (m) => !chosen.has(m.move.id) && words.every((w) => m.move.name.toLowerCase().includes(w)),
  );

  const run = (action: () => void) => {
    try {
      action();
      setError(null);
    } catch (e) {
      if (isDomainError(e)) setError(e.message);
      else throw e;
    }
  };

  return (
    <div className="move-picker">
      <ul className="chosen-moves">
        {member.moves.map((move) => (
          <li key={move.id}>
            {move.type && <TypeBadges types={[move.type]} />} {move.name}
            <button
              type="button"
              className="remove"
              aria-label={`Remove ${move.name}`}
              onClick={() => run(() => builder.removeTeamMemberMove(teamId, member.id, move.id))}
            >
              ×
            </button>
          </li>
        ))}
        {member.moves.length === 0 && <li className="muted">No moves chosen.</li>}
      </ul>
      <button type="button" className="move-picker-toggle" onClick={() => setOpen(!open)} disabled={full && !open}>
        {full ? `${MAX_MOVES}/${MAX_MOVES} moves` : open ? 'Close move list' : 'Add move'}
      </button>
      {open && (
        <div className="move-picker-list">
          <input
            type="search"
            placeholder={`Search ${learnable.length} learnable moves`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <ul>
            {shown.map(({ move, sources, aboveBoxEntryLevel }) => (
              <li key={move.id}>
                <button
                  type="button"
                  disabled={full}
                  title={move.description}
                  onClick={() => run(() => builder.addTeamMemberMove(teamId, member.id, move.id))}
                >
                  <span className="move-name">
                    {move.type && <TypeBadges types={[move.type]} />} {move.name}
                  </span>
                  <span className="move-stats muted">{moveStats(move)}</span>
                  <span className="move-sources">
                    {sources.map(sourceLabel).join(', ')}
                    {aboveBoxEntryLevel && (
                      <span className="level-flag" title={`Learned by level-up above the Box Entry's level (Lv ${boxLevel})`}>
                        {' '}above Lv {boxLevel}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
            {shown.length === 0 && <li className="muted">No matching moves.</li>}
          </ul>
        </div>
      )}
      {error && <p className="flag flag-bad">{error}</p>}
    </div>
  );
}
