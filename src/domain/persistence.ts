// Saving and restoring AppState through a StorageAdapter.
// Ticket 08 adds the data version; ticket 10 adds export/import and unknown-reference checks.
import { initialState, type AppState } from './state';
import type { StorageAdapter } from './storage';

export const STORAGE_KEY = 'soulgold-team-builder';

export function loadState(storage: StorageAdapter): AppState {
  const text = storage.load(STORAGE_KEY);
  if (text === null) return initialState();
  try {
    const parsed = JSON.parse(text) as Partial<AppState>;
    if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.teams) || parsed.teams.length === 0) {
      return initialState();
    }
    return parsed as AppState;
  } catch {
    return initialState();
  }
}

export function saveState(storage: StorageAdapter, state: AppState): void {
  storage.save(STORAGE_KEY, JSON.stringify(state));
}
