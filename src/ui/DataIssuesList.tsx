import type { DataIssues, UnknownReference } from '../domain';

const KIND_LABELS: Record<UnknownReference['kind'], string> = {
  SPECIES: 'Species',
  MOVE: 'move',
  ABILITY: 'Ability',
  MEGA: 'Mega',
};

function where(ref: UnknownReference): string {
  return ref.location.kind === 'TEAM_MEMBER'
    ? `Team “${ref.location.teamName}” (${ref.location.speciesId})`
    : `Box Entry (${ref.location.speciesId})`;
}

/** Lists Data Issues: a data version mismatch and each unknown reference with where it is used. */
export function DataIssuesList({ issues }: { issues: DataIssues }) {
  const { dataVersionMismatch, unknownReferences, affectedTeams, affectedBoxEntries } = issues;
  return (
    <div className="data-issues">
      {dataVersionMismatch && (
        <p>
          Saved with Soulgold data {dataVersionMismatch.saved.hackVersion} (fetched{' '}
          {dataVersionMismatch.saved.fetchedAt.slice(0, 10)}); the app now uses {dataVersionMismatch.current.hackVersion}{' '}
          (fetched {dataVersionMismatch.current.fetchedAt.slice(0, 10)}).
        </p>
      )}
      {unknownReferences.length > 0 && (
        <>
          <p>
            Not in the current data snapshot
            {affectedTeams.length > 0 && <> — affects Teams: {affectedTeams.join(', ')}</>}
            {affectedBoxEntries.length > 0 && <> — affects {affectedBoxEntries.length} Box Entr{affectedBoxEntries.length === 1 ? 'y' : 'ies'}</>}:
          </p>
          <ul>
            {unknownReferences.map((ref, i) => (
              <li key={i}>
                Unknown {KIND_LABELS[ref.kind]} <code>{ref.id}</code> in {where(ref)}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
