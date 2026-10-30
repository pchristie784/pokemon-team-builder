import {
  typeName,
  type DefensiveCoverage as Coverage,
  type PokemonType,
  type TeamMemberId,
  type TeamMemberView,
} from '../domain';
import { TypeBadges } from './TypeBadges';

export function DefensiveCoverage({ coverage, members }: { coverage: Coverage; members: TeamMemberView[] }) {
  const nameOf = (id: TeamMemberId) => members.find((m) => m.id === id)?.species.displayName ?? '?';
  const names = (ids: TeamMemberId[]) => ids.map(nameOf).join(', ');
  const stacked = new Set<PokemonType>(coverage.stackedWeaknesses.map((p) => p.type));
  const unanswered = new Set<PokemonType>(coverage.unansweredTypes.map((p) => p.type));

  return (
    <div className="defensive-coverage">
      <h3>Defensive Coverage</h3>
      <ul className="critique-flags">
        {coverage.stackedWeaknesses.map((p) => (
          <li key={`s-${p.type}`} className="flag flag-bad">
            <TypeBadges types={[p.type]} /> Stacked Weakness
          </li>
        ))}
        {coverage.unansweredTypes.map((p) => (
          <li key={`u-${p.type}`} className="flag flag-warn">
            <TypeBadges types={[p.type]} /> Unanswered Type
          </li>
        ))}
        {coverage.quadWeaknesses.map((p) => (
          <li key={`q-${p.memberId}-${p.type}`} className="flag flag-bad">
            {nameOf(p.memberId)} is 4× weak to {typeName(p.type)}
          </li>
        ))}
        {coverage.stackedWeaknesses.length + coverage.unansweredTypes.length + coverage.quadWeaknesses.length ===
          0 && <li className="muted">No Stacked Weaknesses, Unanswered Types or 4× weaknesses.</li>}
      </ul>
      <table className="coverage-table">
        <thead>
          <tr>
            <th>Attacking type</th>
            <th>Weak</th>
            <th>Resist</th>
            <th>Immune</th>
          </tr>
        </thead>
        <tbody>
          {coverage.byType.map((t) => (
            <tr
              key={t.attackType}
              className={stacked.has(t.attackType) ? 'row-bad' : unanswered.has(t.attackType) ? 'row-warn' : ''}
            >
              <td>
                <TypeBadges types={[t.attackType]} />
              </td>
              <td title={names(t.weak)}>{t.weak.length || ''}</td>
              <td title={names(t.resist)}>{t.resist.length || ''}</td>
              <td title={names(t.immune)}>{t.immune.length || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
