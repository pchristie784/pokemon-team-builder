import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createTeamBuilder, LocalStorageAdapter } from './domain';
import { App } from './ui/App';
import { TeamBuilderProvider } from './ui/useTeamBuilder';
import './ui/styles.css';

const builder = createTeamBuilder({ storage: new LocalStorageAdapter() });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TeamBuilderProvider builder={builder}>
      <App />
    </TeamBuilderProvider>
  </StrictMode>,
);
