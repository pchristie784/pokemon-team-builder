// React glue: provides the TeamBuilder facade and re-renders on every AppState change.
import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import type { TeamBuilder } from '../domain';

const TeamBuilderContext = createContext<TeamBuilder | null>(null);

export function TeamBuilderProvider({ builder, children }: { builder: TeamBuilder; children: ReactNode }) {
  return <TeamBuilderContext.Provider value={builder}>{children}</TeamBuilderContext.Provider>;
}

/** The facade; the calling component re-renders whenever AppState changes. */
export function useTeamBuilder(): TeamBuilder {
  const builder = useContext(TeamBuilderContext);
  if (!builder) throw new Error('useTeamBuilder must be used inside TeamBuilderProvider');
  useSyncExternalStore(builder.subscribe, builder.getState);
  return builder;
}
