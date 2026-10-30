// Saving and restoring AppState through a StorageAdapter.
// Loading is tolerant: fields missing from older saves get their defaults, malformed entries are
// dropped, and unreadable data starts fresh. Ticket 10 adds export/import and unknown-reference checks.
import type { DataVersion } from './data/model';
import { DIFFICULTIES, initialState, type AppState, type Difficulty } from './state';
import type { StorageAdapter } from './storage';
import type { Team, TeamMember } from './team';
import { MODES, type BoxEntry, type Mode } from './box';

export const STORAGE_KEY = 'soulgold-team-builder';

export function loadState(storage: StorageAdapter): AppState {
  const text = storage.load(STORAGE_KEY);
  if (text === null) return initialState();
  try {
    return parseState(JSON.parse(text)) ?? initialState();
  } catch {
    return initialState();
  }
}

export function saveState(storage: StorageAdapter, state: AppState): void {
  storage.save(STORAGE_KEY, JSON.stringify(state));
}

/** Records the data version a state is saved with, so mismatches with a later snapshot can be detected. */
export function stampDataVersion(state: AppState, version: DataVersion): AppState {
  const saved = state.dataVersion;
  if (saved?.hackVersion === version.hackVersion && saved.fetchedAt === version.fetchedAt) return state;
  return { ...state, dataVersion: { hackVersion: version.hackVersion, fetchedAt: version.fetchedAt } };
}

/** Turns parsed saved data into an AppState, defaulting anything missing; null if it is not usable. */
export function parseState(raw: unknown): AppState | null {
  if (!isRecord(raw) || raw.schemaVersion !== 1 || !Array.isArray(raw.teams)) return null;
  const teams = raw.teams.flatMap((t) => {
    const team = parseTeam(t);
    return team ? [team] : [];
  });
  if (teams.length === 0) return null;
  const activeTeamId = teams.some((t) => t.id === raw.activeTeamId)
    ? (raw.activeTeamId as string)
    : teams[0]!.id;
  return {
    schemaVersion: 1,
    teams,
    activeTeamId,
    difficulty: DIFFICULTIES.includes(raw.difficulty as Difficulty) ? (raw.difficulty as Difficulty) : 'NORMAL',
    dataVersion: parseDataVersion(raw.dataVersion),
    box: Array.isArray(raw.box) ? raw.box.flatMap((e) => parseBoxEntry(e) ?? []) : [],
    mode: MODES.includes(raw.mode as Mode) ? (raw.mode as Mode) : 'DEX',
  };
}

function parseTeam(raw: unknown): Team | null {
  if (!isRecord(raw) || typeof raw.id !== 'string') return null;
  const members = Array.isArray(raw.members)
    ? raw.members.flatMap((m) => {
        const member = parseTeamMember(m);
        return member ? [member] : [];
      })
    : [];
  return { id: raw.id, name: typeof raw.name === 'string' ? raw.name : 'Team', members };
}

function parseTeamMember(raw: unknown): TeamMember | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.speciesId !== 'string') return null;
  return {
    ...raw, // keep fields later tickets add
    id: raw.id,
    speciesId: raw.speciesId,
    moves: Array.isArray(raw.moves) ? raw.moves.filter((m): m is string => typeof m === 'string') : [],
    abilityId: typeof raw.abilityId === 'string' ? raw.abilityId : null,
    mega: typeof raw.mega === 'string' ? raw.mega : null, // saves before ticket 07 stored `false`
    boxEntryId: typeof raw.boxEntryId === 'string' ? raw.boxEntryId : null,
  };
}

function parseBoxEntry(raw: unknown): BoxEntry | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.speciesId !== 'string') return null;
  const level = typeof raw.level === 'number' && Number.isInteger(raw.level) ? raw.level : null;
  return { id: raw.id, speciesId: raw.speciesId, level };
}

function parseDataVersion(raw: unknown): DataVersion | null {
  if (!isRecord(raw) || typeof raw.hackVersion !== 'string' || typeof raw.fetchedAt !== 'string') return null;
  return { hackVersion: raw.hackVersion, fetchedAt: raw.fetchedAt };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
