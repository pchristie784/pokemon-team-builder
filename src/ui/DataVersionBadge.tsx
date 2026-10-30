import { useTeamBuilder } from './useTeamBuilder';

export function DataVersionBadge() {
  const { hackVersion, fetchedAt } = useTeamBuilder().getDataVersion();
  return (
    <span className="data-version" title={`Data fetched ${fetchedAt.slice(0, 10)}`}>
      Soulgold data {hackVersion}
    </span>
  );
}
