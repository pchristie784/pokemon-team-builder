// Export and import of all saved data as versioned JSON, plus Data Issues: references to Species,
// moves, Abilities or Megas the current data snapshot doesn't have, and a data version mismatch.
// Checks run on AppState, which keeps unknown ids as saved (views drop them; this module flags them).
import type { DataVersion } from './data/model';
import type { DataSnapshot } from './data/snapshot';
import { findMega } from './data/megas';
import { DomainError } from './errors';
import { parseState, stampDataVersion } from './persistence';
import type { AppState } from './state';
import type { TeamId, TeamMemberId } from './team';
import type { BoxEntryId } from './box';

/** Marks a JSON file as an export of this app. */
export const EXPORT_FORMAT = 'soulgold-team-builder-export';
/** The export file layout version; bumped if the wrapper (not AppState) changes shape. */
export const EXPORT_VERSION = 1;

interface ExportFile {
  format: typeof EXPORT_FORMAT;
  exportVersion: typeof EXPORT_VERSION;
  exportedAt: string;
  /** The whole AppState, including schemaVersion and the data version it was saved with. */
  state: AppState;
}

export type UnknownReferenceKind = 'SPECIES' | 'MOVE' | 'ABILITY' | 'MEGA';

/** Where an unknown reference was found: a Team Member of a Team, or a Box Entry. */
export type ReferenceLocation =
  | { kind: 'TEAM_MEMBER'; teamId: TeamId; teamName: string; teamMemberId: TeamMemberId; speciesId: string }
  | { kind: 'BOX_ENTRY'; boxEntryId: BoxEntryId; speciesId: string };

export interface UnknownReference {
  kind: UnknownReferenceKind;
  /** The hack constant missing from the data snapshot, e.g. SPECIES_*, MOVE_*. */
  id: string;
  location: ReferenceLocation;
}

export interface DataIssues {
  /** Set when the data was saved with a different data snapshot than the current one. */
  dataVersionMismatch: { saved: DataVersion; current: DataVersion } | null;
  unknownReferences: UnknownReference[];
  /** Names of Teams with at least one unknown reference, in Team order. */
  affectedTeams: string[];
  /** Box Entries whose Species is unknown. */
  affectedBoxEntries: BoxEntryId[];
}

export type ImportPreview =
  | { ok: false; error: string }
  | {
      ok: true;
      teamNames: string[];
      teamMemberCount: number;
      boxEntryCount: number;
      exportedAt: string | null;
      issues: DataIssues;
    };

export function exportState(state: AppState, data: DataSnapshot, now = new Date()): string {
  const file: ExportFile = {
    format: EXPORT_FORMAT,
    exportVersion: EXPORT_VERSION,
    exportedAt: now.toISOString(),
    state: stampDataVersion(state, data.version),
  };
  return JSON.stringify(file, null, 2);
}

/** Reads an export file into an AppState. Throws DomainError 'INVALID_IMPORT' with a player-readable message. */
export function parseExport(json: string): { state: AppState; exportedAt: string | null } {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw invalid('The file is not valid JSON.');
  }
  if (!isRecord(raw) || raw.format !== EXPORT_FORMAT) {
    throw invalid('The file is not a Soulgold Team Builder export.');
  }
  if (raw.exportVersion !== EXPORT_VERSION || !isRecord(raw.state)) {
    throw invalid('The export was made by an unsupported version of the app.');
  }
  if (raw.state.schemaVersion !== 1) {
    throw invalid('The export was made by a newer version of the app.');
  }
  const state = parseState(raw.state);
  if (!state) throw invalid('The export contains no usable Teams.');
  return { state, exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : null };
}

export function previewImport(json: string, data: DataSnapshot): ImportPreview {
  let parsed: ReturnType<typeof parseExport>;
  try {
    parsed = parseExport(json);
  } catch (error) {
    if (error instanceof DomainError) return { ok: false, error: error.message };
    throw error;
  }
  const { state, exportedAt } = parsed;
  return {
    ok: true,
    teamNames: state.teams.map((t) => t.name),
    teamMemberCount: state.teams.reduce((n, t) => n + t.members.length, 0),
    boxEntryCount: state.box.length,
    exportedAt,
    issues: dataIssues(state, data),
  };
}

/** Unknown references in Teams and the Box, and a data version mismatch, for any AppState. */
export function dataIssues(state: AppState, data: DataSnapshot): DataIssues {
  const unknownReferences: UnknownReference[] = [];
  for (const team of state.teams) {
    for (const member of team.members) {
      const location: ReferenceLocation = {
        kind: 'TEAM_MEMBER',
        teamId: team.id,
        teamName: team.name,
        teamMemberId: member.id,
        speciesId: member.speciesId,
      };
      const add = (kind: UnknownReferenceKind, id: string) => unknownReferences.push({ kind, id, location });
      const speciesKnown = data.getSpecies(member.speciesId) !== undefined;
      if (!speciesKnown) add('SPECIES', member.speciesId);
      for (const moveId of member.moves) if (!data.getMove(moveId)) add('MOVE', moveId);
      if (member.abilityId && !data.getAbility(member.abilityId)) add('ABILITY', member.abilityId);
      // A Mega of an unknown Species is covered by the Species flag.
      if (member.mega && speciesKnown && !findMega(data, member.speciesId, member.mega)) add('MEGA', member.mega);
    }
  }
  for (const entry of state.box) {
    if (!data.getSpecies(entry.speciesId)) {
      unknownReferences.push({
        kind: 'SPECIES',
        id: entry.speciesId,
        location: { kind: 'BOX_ENTRY', boxEntryId: entry.id, speciesId: entry.speciesId },
      });
    }
  }
  const affectedTeamIds = new Set(unknownReferences.flatMap((r) => (r.location.kind === 'TEAM_MEMBER' ? [r.location.teamId] : [])));
  return {
    dataVersionMismatch: versionMismatch(state.dataVersion, data.version),
    unknownReferences,
    affectedTeams: state.teams.filter((t) => affectedTeamIds.has(t.id)).map((t) => t.name),
    affectedBoxEntries: unknownReferences.flatMap((r) => (r.location.kind === 'BOX_ENTRY' ? [r.location.boxEntryId] : [])),
  };
}

export function hasDataIssues(issues: DataIssues): boolean {
  return issues.dataVersionMismatch !== null || issues.unknownReferences.length > 0;
}

function versionMismatch(saved: DataVersion | null, current: DataVersion): DataIssues['dataVersionMismatch'] {
  if (!saved || (saved.hackVersion === current.hackVersion && saved.fetchedAt === current.fetchedAt)) return null;
  return { saved, current };
}

function invalid(message: string): DomainError {
  return new DomainError('INVALID_IMPORT', message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
