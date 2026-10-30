// Suggestions (GLOSSARY.md): candidate Species that fix the Team's Critique problems, ranked.
//
// How a Suggestion is found: for each candidate Species and each action (fill an empty slot, or replace a
// Team Member), build the hypothetical Team as a TeamView and diff its Critique problems against the Team's.
//
// Decisions (ticket 11):
// - Only the SUGGESTION_SECTIONS' problems count, both as fixes and as introduced problems. Ticket 12 widens it to the
//   offensive kinds once candidates come with proposed moves (moveless candidates would otherwise look like
//   they introduce offensive gaps).
// - Candidates use their default state: no chosen Ability (Innates apply), no Mega, no moves.
// - A Team with fewer than six members gets fill Suggestions only; a full Team gets replace Suggestions for
//   each Team Member. Species already on the Team (the replaced member aside) are not suggested, nor are Box
//   Entries a remaining Team Member is already linked to.
// - Ranking: a candidate that adds a new Stacked Weakness ranks below every candidate that doesn't (not
//   excluded, so a Team with no clean option still sees something); then most problems fixed; then fewest
//   problems introduced; then fewest new weaknesses (attacking types the candidate itself is weak to);
//   then highest base stat total; then display name. Candidates that fix nothing are left out.
// - Each Species appears once, for its best-ranked action (a full Team would otherwise see one strong Species
//   once per replaceable member).
// - In Box Mode the same Species via several Box Entries is suggested once per action (the first Box Entry
//   with it as its own Species, else the first it is a Planned Evolution of).
import { POKEMON_TYPES, typeName, type PokemonType } from './pokemonTypes';
import { boxCandidates, addTeamMemberInMode, type BoxEntryId } from './box';
import type { CritiqueProblem } from './critique';
import { defensiveCoverage, memberDefensiveMultiplier } from './critique/defensive';
import { statRoles } from './critique/statRoles';
import type { PlannedEvolution } from './data/evolutions';
import type { Species } from './data/model';
import type { DataSnapshot } from './data/snapshot';
import type { AppState } from './state';
import { findTeam, removeTeamMember, updateTeam, MAX_TEAM_MEMBERS, type TeamId, type TeamMemberId } from './team';
import { viewTeam, viewTeamMember, type TeamMemberView, type TeamView } from './teamView';

/**
 * The Critique sections whose problems a Suggestion gets credit for fixing (and is charged for introducing).
 * Only these sections are evaluated, which keeps Dex Mode fast (thousands of hypothetical Teams per call).
 * Ticket 12 adds the Offensive Coverage section here.
 */
const SUGGESTION_SECTIONS: ((team: TeamView) => CritiqueProblem[])[] = [
  (team) => {
    const defensive = defensiveCoverage(team, memoisedMultiplier);
    return [...defensive.stackedWeaknesses, ...defensive.unansweredTypes];
  },
  (team) => statRoles(team).flags,
];

// Member views are immutable and rebuilt on every query, so a WeakMap keyed by view is safe and short-lived.
const multipliers = new WeakMap<TeamMemberView, number[]>();
function memoisedMultiplier(member: TeamMemberView, attackType: PokemonType): number {
  let byType = multipliers.get(member);
  if (!byType) {
    byType = POKEMON_TYPES.map((t) => memberDefensiveMultiplier(member, t));
    multipliers.set(member, byType);
  }
  return byType[POKEMON_TYPES.indexOf(attackType)]!;
}

/** At most this many Suggestions are returned. */
export const MAX_SUGGESTIONS = 20;

export type SuggestionAction =
  | { kind: 'fill' }
  | { kind: 'replace'; memberId: TeamMemberId; /** The replaced Team Member's Species. */ species: Species };

export interface Suggestion {
  species: Species;
  /** The Box Entry it comes from (Box Mode), else null. */
  boxEntryId: BoxEntryId | null;
  /** Set when it is a Planned Evolution of that Box Entry. */
  plannedEvolution: PlannedEvolution | null;
  action: SuggestionAction;
  /** Problems present in the Team's Critique and absent once the Suggestion is applied. */
  fixes: CritiqueProblem[];
  /** Problems absent now and present once the Suggestion is applied. */
  introduces: CritiqueProblem[];
  /** Attacking types the candidate itself is weak to (the "new weaknesses" tie-break). */
  newWeaknesses: PokemonType[];
  /** E.g. "fixes: Ground Stacked Weakness, Dragon Unanswered Type; adds: Ice Stacked Weakness". */
  reason: string;
}

interface Candidate {
  species: Species;
  boxEntryId: BoxEntryId | null;
  plannedEvolution: PlannedEvolution | null;
}

const CANDIDATE_MEMBER_ID = 'suggestion-candidate';

export function problemLabel(problem: CritiqueProblem): string {
  switch (problem.kind) {
    case 'stackedWeakness':
      return `${typeName(problem.type)} Stacked Weakness`;
    case 'unansweredType':
      return `${typeName(problem.type)} Unanswered Type`;
    case 'noSuperEffectiveHit':
      return `no super effective hit on ${typeName(problem.type)}`;
    case 'reducedDamageOnly':
      return `only reduced damage on ${typeName(problem.type)}`;
    case 'allPhysical':
      return 'all physical attackers';
    case 'allSpecial':
      return 'all special attackers';
    case 'noFastMember':
      return 'no Fast member';
  }
}

const problemKey = (p: CritiqueProblem): string => ('type' in p ? `${p.kind}:${p.type}` : p.kind);

function countedProblems(team: TeamView): Map<string, CritiqueProblem> {
  return new Map(SUGGESTION_SECTIONS.flatMap((section) => section(team)).map((p) => [problemKey(p), p]));
}

function candidatePool(state: AppState, data: DataSnapshot): Candidate[] {
  if (state.mode === 'DEX') {
    return data.allSpecies().map((species) => ({ species, boxEntryId: null, plannedEvolution: null }));
  }
  // Own Species first, so a Species that is both a Box Entry and a Planned Evolution comes from its own entry.
  const all = boxCandidates(state, data);
  return [...all.filter((c) => !c.plannedEvolution), ...all.filter((c) => c.plannedEvolution)];
}

const bst = (s: Species) => s.stats.hp + s.stats.atk + s.stats.def + s.stats.spa + s.stats.spd + s.stats.spe;

export function suggest(state: AppState, data: DataSnapshot, teamId: TeamId): Suggestion[] {
  const team = viewTeam(findTeam(state, teamId), data, state.box);
  const before = countedProblems(team);
  const pool = candidatePool(state, data);

  const actions: { action: SuggestionAction; others: TeamMemberView[]; index: number }[] =
    team.members.length < MAX_TEAM_MEMBERS
      ? [{ action: { kind: 'fill' }, others: team.members, index: team.members.length }]
      : team.members.map((m, index) => ({
          action: { kind: 'replace', memberId: m.id, species: m.species },
          others: team.members.filter((o) => o !== m),
          index,
        }));

  const candidateViews = new Map<string, TeamMemberView>();
  const viewOf = (species: Species): TeamMemberView => {
    let view = candidateViews.get(species.id);
    if (!view) {
      const member = { id: CANDIDATE_MEMBER_ID, speciesId: species.id, moves: [], abilityId: null, mega: null };
      view = viewTeamMember(member, data)!;
      candidateViews.set(species.id, view);
    }
    return view;
  };

  const ranked: { suggestion: Suggestion; penalised: boolean; bst: number }[] = [];
  for (const { action, others, index } of actions) {
    const taken = new Set(others.map((m) => m.species.id));
    const usedEntries = new Set(others.flatMap((m) => (m.boxEntry ? [m.boxEntry.id] : [])));
    const seen = new Set<string>();
    for (const candidate of pool) {
      const { species } = candidate;
      if (taken.has(species.id) || seen.has(species.id)) continue;
      if (action.kind === 'replace' && action.species.id === species.id) continue;
      if (candidate.boxEntryId && usedEntries.has(candidate.boxEntryId)) continue;
      seen.add(species.id);

      const view = viewOf(species);
      const members = [...others];
      members.splice(index, 0, view);
      const after = countedProblems({ ...team, members, isFull: members.length >= MAX_TEAM_MEMBERS });
      const fixes = [...before].filter(([k]) => !after.has(k)).map(([, p]) => p);
      if (fixes.length === 0) continue;
      const introduces = [...after].filter(([k]) => !before.has(k)).map(([, p]) => p);
      const newWeaknesses = POKEMON_TYPES.filter((t) => memoisedMultiplier(view, t) > 1);
      const reason =
        `fixes: ${fixes.map(problemLabel).join(', ')}` +
        (introduces.length ? `; adds: ${introduces.map(problemLabel).join(', ')}` : '');
      ranked.push({
        suggestion: { ...candidate, action, fixes, introduces, newWeaknesses, reason },
        penalised: introduces.some((p) => p.kind === 'stackedWeakness'),
        bst: bst(species),
      });
    }
  }

  ranked.sort(
    (a, b) =>
      Number(a.penalised) - Number(b.penalised) ||
      b.suggestion.fixes.length - a.suggestion.fixes.length ||
      a.suggestion.introduces.length - b.suggestion.introduces.length ||
      a.suggestion.newWeaknesses.length - b.suggestion.newWeaknesses.length ||
      b.bst - a.bst ||
      a.suggestion.species.displayName.localeCompare(b.suggestion.species.displayName),
  );
  // A Species is suggested once, for its best-ranked action, so one strong Species can't fill the whole list.
  const suggested = new Set<string>();
  const best = ranked.filter((r) => !suggested.has(r.suggestion.species.id) && suggested.add(r.suggestion.species.id));
  return best.slice(0, MAX_SUGGESTIONS).map((r) => r.suggestion);
}

/**
 * Applies a Suggestion in one action: fills an empty slot, or replaces the named Team Member in its position.
 * Mode rules apply as for adding a Team Member; the Suggestion's Box Entry is kept.
 */
export function applySuggestion(state: AppState, data: DataSnapshot, teamId: TeamId, suggestion: Suggestion): AppState {
  const boxEntryId = suggestion.boxEntryId ?? undefined;
  if (suggestion.action.kind === 'fill') {
    return addTeamMemberInMode(state, data, teamId, suggestion.species.id, boxEntryId);
  }
  const { memberId } = suggestion.action;
  const index = findTeam(state, teamId).members.findIndex((m) => m.id === memberId);
  const added = addTeamMemberInMode(removeTeamMember(state, teamId, memberId), data, teamId, suggestion.species.id, boxEntryId);
  return updateTeam(added, teamId, (team) => {
    const members = [...team.members];
    const [newMember] = members.splice(members.length - 1, 1);
    members.splice(index, 0, newMember!);
    return { ...team, members };
  });
}
