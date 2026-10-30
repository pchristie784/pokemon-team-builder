import { hasDataIssues } from '../domain';
import { DataIssuesList } from './DataIssuesList';
import { useTeamBuilder } from './useTeamBuilder';

/** Warns when the saved data refers to things the current data snapshot lacks, or was saved with other data. */
export function DataIssuesBanner() {
  const issues = useTeamBuilder().getDataIssues();
  if (!hasDataIssues(issues)) return null;
  return (
    <div className="data-issues-banner" role="alert">
      <strong>Check your saved data</strong>
      <DataIssuesList issues={issues} />
    </div>
  );
}
