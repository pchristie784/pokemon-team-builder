import { DataVersionBadge } from './DataVersionBadge';
import { TeamEditor } from './TeamEditor';
import { useTeamBuilder } from './useTeamBuilder';

export function App() {
  const builder = useTeamBuilder();
  return (
    <div className="app">
      <header className="app-header">
        <h1>Soulgold Team Builder</h1>
        <DataVersionBadge />
      </header>
      <main>
        <TeamEditor teamId={builder.getActiveTeamId()} />
      </main>
    </div>
  );
}
