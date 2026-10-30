import {
  problemLabel,
  typeName,
  type CoverageSource,
  type OffensiveCoverage as Coverage,
  type PokemonType,
  type TeamMemberView,
} from '../domain';
import { TypeBadges } from './TypeBadges';

function multiplierLabel(multiplier: number | null): string {
  if (multiplier === null) return '—';
  return `${multiplier}×`;
}

export function OffensiveCoverage({ coverage, members }: { coverage: Coverage; members: TeamMemberView[] }) {
  const member = (id: string) => members.find((m) => m.id === id);
  const describe = (s: CoverageSource) => {
    const m = member(s.memberId);
    const move = m?.moves.find((mv) => mv.id === s.moveId);
    const converted = move && move.type !== s.moveType ? ` (as ${typeName(s.moveType)})` : '';
    return `${m?.species.displayName ?? '?'}: ${move?.name ?? s.moveId}${converted}`;
  };
  const reduced = new Set<PokemonType>(coverage.typesHitOnlyAtReducedDamage.map((p) => p.type));
  const noSuper = new Set<PokemonType>(coverage.typesWithoutSuperEffectiveHit.map((p) => p.type));
  const hasMoves = coverage.byType.some((t) => t.multiplier !== null);

  return (
    <div className="offensive-coverage">
      <h3>Offensive Coverage</h3>
      {!hasMoves ? (
        <p className="muted">Choose damaging moves for Team Members to see Offensive Coverage.</p>
      ) : (
        <>
          <ul className="critique-flags">
            {coverage.typesHitOnlyAtReducedDamage.map((p) => (
              <li key={`r-${p.type}`} className="flag flag-bad">
                {problemLabel(p)}
              </li>
            ))}
            {coverage.typesWithoutSuperEffectiveHit
              .filter((p) => !reduced.has(p.type))
              .map((p) => (
                <li key={`n-${p.type}`} className="flag flag-warn">
                  {problemLabel(p)}
                </li>
              ))}
            {noSuper.size === 0 && <li className="muted">Every type is hit super-effectively.</li>}
          </ul>
          <table className="coverage-table offensive-table">
            <thead>
              <tr>
                <th>Defending type</th>
                <th>Best</th>
                <th>Covered by</th>
              </tr>
            </thead>
            <tbody>
              {coverage.byType.map((t) => (
                <tr
                  key={t.defendType}
                  className={reduced.has(t.defendType) ? 'row-bad' : noSuper.has(t.defendType) ? 'row-warn' : ''}
                >
                  <td>
                    <TypeBadges types={[t.defendType]} />
                  </td>
                  <td>{multiplierLabel(t.multiplier)}</td>
                  <td className="covered-by">{t.sources.map(describe).join('; ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
