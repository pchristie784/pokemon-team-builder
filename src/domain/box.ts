// The Box (Box Entries the player owns) and Box Mode / Dex Mode rules.
// Pure functions over AppState; they throw DomainError on a broken rule.
//
// Decisions (ticket 09):
// - Mode defaults to Dex Mode, for new and older saves alike: an empty Box in Box Mode would block every
//   Team Member, and Teams saved before the Box existed were built without one.
// - Switching mode never changes Teams; Box Mode restrictions apply only when adding a Team Member.
// - A Team Member added in Box Mode records its Box Entry (`boxEntryId`); in Dex Mode it is null unless a
//   Box Entry is passed explicitly. It is a Planned Evolution when its Species differs from its Box Entry's.
//   Without an explicit Box Entry, Box Mode links the first Box Entry of that Species, else the first
//   Box Entry it is a Planned Evolution of.
// - Removing a Box Entry keeps its Team Members but unlinks them (boxEntryId null): no Team is silently
//   changed beyond losing the link. Changing a Box Entry's Species unlinks members whose Species is no
//   longer that Species or one of its Planned Evolutions.
import type { Species, SpeciesId } from './data/model';
import type { DataSnapshot } from './data/snapshot';
import type { LearnableMove } from './data/learnset';
import { plannedEvolutions, type PlannedEvolution } from './data/evolutions';
import { addTeamMember, findTeam, updateTeamMember, type TeamId, type TeamMember } from './team';
import { DomainError } from './errors';
import { newId } from './ids';
import type { AppState } from './state';

export type BoxEntryId = string;

/** One owned Species in the Box, with an optional current level (GLOSSARY.md). */
export interface BoxEntry {
  id: BoxEntryId;
  speciesId: SpeciesId;
  level: number | null;
}

export const MODES = ['BOX', 'DEX'] as const;
/** Box Mode: Team Members come only from the Box and its Planned Evolutions. Dex Mode: any Species. */
export type Mode = (typeof MODES)[number];

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 100;

/** A Box Entry with its Species resolved. */
export interface BoxEntryView {
  id: BoxEntryId;
  species: Species;
  level: number | null;
  /** Every later evolution, each with its path and method labels. */
  plannedEvolutions: PlannedEvolution[];
}

export function findBoxEntry(state: AppState, id: BoxEntryId): BoxEntry {
  const entry = state.box.find((e) => e.id === id);
  if (!entry) throw new DomainError('UNKNOWN_BOX_ENTRY', `No Box Entry with id ${id}`);
  return entry;
}

function checkSpecies(data: DataSnapshot, speciesId: SpeciesId): void {
  if (!data.getSpecies(speciesId)) {
    throw new DomainError('UNKNOWN_SPECIES', `${speciesId} is not a Species in this data snapshot`);
  }
}

function checkLevel(level: number | null): void {
  if (level !== null && !(Number.isInteger(level) && level >= MIN_LEVEL && level <= MAX_LEVEL)) {
    throw new DomainError('INVALID_LEVEL', `A level is a whole number from ${MIN_LEVEL} to ${MAX_LEVEL}`);
  }
}

export function addBoxEntry(state: AppState, data: DataSnapshot, speciesId: SpeciesId, level: number | null): AppState {
  checkSpecies(data, speciesId);
  checkLevel(level);
  return { ...state, box: [...state.box, { id: newId(), speciesId, level }] };
}

export function viewBox(state: AppState, data: DataSnapshot): BoxEntryView[] {
  return state.box.flatMap((entry) => {
    const species = data.getSpecies(entry.speciesId);
    if (!species) return []; // missing from the snapshot: flagged by ticket 10
    return [{ id: entry.id, species, level: entry.level, plannedEvolutions: plannedEvolutions(data, entry.speciesId) }];
  });
}

function updateBoxEntry(state: AppState, id: BoxEntryId, change: (entry: BoxEntry) => BoxEntry): AppState {
  const entry = findBoxEntry(state, id);
  const changed = change(entry);
  return changed === entry ? state : { ...state, box: state.box.map((e) => (e === entry ? changed : e)) };
}

export function setBoxEntryLevel(state: AppState, id: BoxEntryId, level: number | null): AppState {
  checkLevel(level);
  return updateBoxEntry(state, id, (e) => (e.level === level ? e : { ...e, level }));
}

export function setBoxEntrySpecies(state: AppState, data: DataSnapshot, id: BoxEntryId, speciesId: SpeciesId): AppState {
  checkSpecies(data, speciesId);
  const changed = updateBoxEntry(state, id, (e) => (e.speciesId === speciesId ? e : { ...e, speciesId }));
  if (changed === state) return state;
  const entry = findBoxEntry(changed, id);
  return unlinkMembers(changed, (m) => m.boxEntryId === id && !linkTo(entry, m.speciesId, data));
}

export function removeBoxEntry(state: AppState, id: BoxEntryId): AppState {
  findBoxEntry(state, id);
  return unlinkMembers({ ...state, box: state.box.filter((e) => e.id !== id) }, (m) => m.boxEntryId === id);
}

/** Clears the Box Entry link of matching Team Members on every Team; the members themselves stay. */
function unlinkMembers(state: AppState, matches: (member: TeamMember) => boolean): AppState {
  return {
    ...state,
    teams: state.teams.map((team) =>
      team.members.some(matches)
        ? { ...team, members: team.members.map((m) => (matches(m) ? { ...m, boxEntryId: null } : m)) }
        : team,
    ),
  };
}

// --- Box Mode / Dex Mode ---

export function setMode(state: AppState, mode: Mode): AppState {
  return state.mode === mode ? state : { ...state, mode };
}

/** One Species the Box offers: a Box Entry's own Species, or one of its Planned Evolutions. */
export interface BoxCandidate {
  species: Species;
  boxEntryId: BoxEntryId;
  /** Null for the Box Entry's own Species. */
  plannedEvolution: PlannedEvolution | null;
}

/** The Box Mode candidate pool: each Box Entry's Species, then its Planned Evolutions, in Box order. */
export function boxCandidates(state: AppState, data: DataSnapshot): BoxCandidate[] {
  return viewBox(state, data).flatMap((entry) => [
    { species: entry.species, boxEntryId: entry.id, plannedEvolution: null },
    ...entry.plannedEvolutions.map((e) => ({ species: e.species, boxEntryId: entry.id, plannedEvolution: e })),
  ]);
}

/** How a Species relates to a Box Entry: undefined if it is neither the entry's Species nor a later evolution. */
function linkTo(
  entry: BoxEntry,
  speciesId: SpeciesId,
  data: DataSnapshot,
): { plannedEvolution: PlannedEvolution | null } | undefined {
  if (entry.speciesId === speciesId) return { plannedEvolution: null };
  const planned = plannedEvolutions(data, entry.speciesId).find((e) => e.species.id === speciesId);
  return planned ? { plannedEvolution: planned } : undefined;
}

/**
 * Adds a Team Member, enforcing Box Mode: the Species must be a Box Entry's or one of its Planned
 * Evolutions. `boxEntryId` picks the Box Entry; otherwise the first that fits. In Dex Mode any Species
 * may be added, linked to a Box Entry only when `boxEntryId` is given.
 */
export function addTeamMemberInMode(
  state: AppState,
  data: DataSnapshot,
  teamId: TeamId,
  speciesId: SpeciesId,
  boxEntryId?: BoxEntryId,
): AppState {
  let entry: BoxEntry | undefined;
  if (boxEntryId !== undefined) {
    entry = findBoxEntry(state, boxEntryId);
    if (data.getSpecies(speciesId) && !linkTo(entry, speciesId, data)) {
      throw new DomainError('NOT_IN_BOX', `${speciesId} is not this Box Entry's Species or a Planned Evolution of it`);
    }
  } else if (state.mode === 'BOX') {
    entry =
      state.box.find((e) => e.speciesId === speciesId) ?? state.box.find((e) => linkTo(e, speciesId, data));
    if (!entry && data.getSpecies(speciesId)) {
      throw new DomainError('NOT_IN_BOX', `In Box Mode, ${speciesId} must be a Box Entry or one of its Planned Evolutions`);
    }
  }
  const added = addTeamMember(state, data, teamId, speciesId); // checks the Species and the six-member limit
  if (!entry) return added;
  const members = findTeam(added, teamId).members;
  const linkedId = entry.id;
  return updateTeamMember(added, teamId, members[members.length - 1]!.id, (m) => ({ ...m, boxEntryId: linkedId }));
}

/** A Team Member's Box Entry, and whether it is a Planned Evolution of it. */
export function boxLinkOf(
  member: TeamMember,
  box: BoxEntry[],
  data: DataSnapshot,
): { boxEntry: BoxEntry | null; plannedEvolution: PlannedEvolution | null } {
  const entry = member.boxEntryId ? box.find((e) => e.id === member.boxEntryId) : undefined;
  const link = entry && linkTo(entry, member.speciesId, data);
  return entry && link ? { boxEntry: entry, plannedEvolution: link.plannedEvolution } : { boxEntry: null, plannedEvolution: null };
}

// --- Level flags in the move picker ---

export interface TeamMemberLearnableMove extends LearnableMove {
  /**
   * True when the move is learned by level-up only above its Box Entry's current level (none of its
   * level-up sources is at or below it). Never set without a linked Box Entry with a level.
   */
  aboveBoxEntryLevel: boolean;
}

export function flagLevelUpMoves(moves: LearnableMove[], boxEntry: BoxEntry | null): TeamMemberLearnableMove[] {
  const level = boxEntry?.level ?? null;
  return moves.map((m) => {
    const levels = m.sources.flatMap((s) => (s.kind === 'levelUp' ? [s.level] : []));
    const above = level !== null && levels.length > 0 && levels.every((l) => l > level);
    return { ...m, aboveBoxEntryLevel: above };
  });
}
