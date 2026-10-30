import { BoxManager } from './BoxManager';
import { CritiquePanel } from './CritiquePanel';
import { ModeToggle } from './ModeToggle';
import { DataVersionBadge } from './DataVersionBadge';
import { DataIssuesBanner } from './DataIssuesBanner';
import { ExportImport } from './ExportImport';
import { SettingsBar } from './SettingsBar';
import { SuggestionsPanel } from './SuggestionsPanel';
import { TeamEditor } from './TeamEditor';
import { TeamList } from './TeamList';
import { useTeamBuilder } from './useTeamBuilder';

export function App() {
  const builder = useTeamBuilder();
  return (
    <div className="app">
      <header className="app-header">
        <h1>Soulgold Team Builder</h1>
        <ModeToggle />
        <SettingsBar />
        <DataVersionBadge />
        <ExportImport />
      </header>
      <DataIssuesBanner />
      <main>
        <TeamList />
        <BoxManager />
        <TeamEditor teamId={builder.getActiveTeamId()} />
        <CritiquePanel teamId={builder.getActiveTeamId()} />
        <SuggestionsPanel teamId={builder.getActiveTeamId()} />
      </main>
    </div>
  );
}
