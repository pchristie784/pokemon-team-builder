// Suggestions (GLOSSARY.md): candidate Species that fix the Team's Critique problems, ranked.
//
// How a Suggestion is found: for each candidate Species and each action (add as a new Team Member, or replace a
// Team Member), build the hypothetical Team as a TeamView and diff its Critique problems against the Team's.
//
// Decisions (ticket 11):
// - Only the SUGGESTION_SECTIONS' problems count, both as fixes and as introduced problems.
// - Candidates use their default state: no chosen Ability (Innates apply), no Mega, and only their proposed moves.
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
//
// Decisions (ticket 12, Offensive Coverage):
// - Offensive problems count only when the Team already has at least one counted (damaging) move. A moveless
//   Team has no Offensive Coverage to diff against, so a candidate with moves would otherwise look like it
//   introduces up to 36 problems; in that case candidates get no proposed moves either (nothing to fix).
// - Once they count, the hypothetical Team's offensive problems are computed from the same baseline rule: every
//   defending type not hit super-effectively (or at least neutrally) is a problem, even if the hypothetical Team
//   has no counted moves left (replacing the only member with moves leaves every type uncovered, not "fixed").
//   Replacing a member therefore drops its moves' coverage.
// - Proposed moves: greedy over the candidate's counted learnable moves, up to MAX_MOVES. Each step picks the
//   move covering the most remaining offensive problems of the hypothetical Team (the others plus moves chosen so
//   far), stopping when nothing more is covered. Ties: available now (not level-up-only above the Box Entry's
//   level; Box Mode only, so a usable move beats one the player must still level for, but an above-level move is
//   still proposed when it covers more), then STAB (move hits as one of the candidate's types), then power, then
//   accuracy (never-miss first). Moves are credited after attack-changing Innates (Pixilate makes Normal Fairy).
// - A proposed move's `fixes` are the offensive problems it covers in the hypothetical Team; for a fill they are
//   the Team's own gaps, for a replace they may include gaps the replaced member's moves used to cover.
import { POKEMON_TYPES, typeName, type PokemonType } from './pokemonTypes';
import { boxCandidates, addTeamMemberInMode, flagLevelUpMoves, usedBoxEntryIds, type BoxEntryId } from './box';
import type { CritiqueProblem } from './critique';
import { problemLabel } from './critique/labels';
import { defensiveCoverage, isWeakness, memberDefensiveMultiplier } from './critique/defensive';
import { countsForCoverage, effectiveMoveType, moveEffectiveness, SUPER_EFFECTIVE } from './critique/offensive';
import { statRoles } from './critique/statRoles';
import type { PlannedEvolution } from './data/evolutions';
import { learnableMoves } from './data/learnset';
import type { Move, Species } from './data/model';
import type { DataSnapshot } from './data/snapshot';
import type { AppState } from './state';
import { findTeam, moveTeamMember, removeTeamMember, setTeamMemberMoves, MAX_MOVES, MAX_TEAM_MEMBERS, type TeamId, type TeamMemberId } from './team';
import { viewTeam, viewTeamMember, type TeamMemberView, type TeamView } from './teamView';

/**
 * The Critique sections whose problems a Suggestion gets credit for fixing (and is charged for introducing).
 * Only these sections are evaluated, which keeps Dex Mode fast (thousands of hypothetical Teams per call).
 * Offensive Coverage counts only when `offensive` is set (the Team has counted moves; see the header).
 */
const SUGGESTION_SECTIONS: ((team: TeamView, offensive: boolean) => CritiqueProblem[])[] = [
  (team) => {
    const defensive = defensiveCoverage(team, memoisedMultiplier);
    return [...defensive.stackedWeaknesses, ...defensive.unansweredTypes];
  },
  (team, offensive) => (offensive ? offensiveProblems(teamHits(team.members)) : []),
  (team) => statRoles(team).flags,
];

// Keyed by the member's effectiveAbilityIds array: built fresh per member view and shared (by reference) with the
// candidate copies that only swap in proposed moves, so those reuse the multipliers. Short-lived, like the views.
const multipliers = new WeakMap<readonly string[], number[]>();
function memoisedMultiplier(member: TeamMemberView, attackType: PokemonType): number {
  let byType = multipliers.get(member.effectiveAbilityIds);
  if (!byType) {
    byType = POKEMON_TYPES.map((t) => memberDefensiveMultiplier(member, t));
    multipliers.set(member.effectiveAbilityIds, byType);
  }
  return byType[POKEMON_TYPES.indexOf(attackType)]!;
}

// --- Offensive Coverage as bit masks (bit i = POKEMON_TYPES[i]) ---

/** The defending types a move (or a set of moves) hits super-effectively, and at least neutrally. */
interface Hits {
  superEffective: number;
  neutral: number;
}

const NO_HITS: Hits = { superEffective: 0, neutral: 0 };
const orHits = (a: Hits, b: Hits): Hits => ({ superEffective: a.superEffective | b.superEffective, neutral: a.neutral | b.neutral });

// Effectiveness depends only on the move's effective type and the user's abilities, so it is shared across moves.
const hitsByTypeAndAbilities = new Map<string, Hits>();
function moveHits(member: TeamMemberView, move: Move): Hits | null {
  if (!countsForCoverage(move)) return null;
  const type = effectiveMoveType(member, move);
  if (type === null) return null;
  const key = `${type}|${member.effectiveAbilityIds.join(',')}`;
  let hits = hitsByTypeAndAbilities.get(key);
  if (!hits) {
    hits = { superEffective: 0, neutral: 0 };
    POKEMON_TYPES.forEach((t, i) => {
      const m = moveEffectiveness(member, move, t);
      if (m >= SUPER_EFFECTIVE) hits!.superEffective |= 1 << i;
      if (m >= 1) hits!.neutral |= 1 << i;
    });
    hitsByTypeAndAbilities.set(key, hits);
  }
  return hits;
}

/** Combined hits of the members' counted moves; null when none of them has a counted move. */
function teamHits(members: TeamMemberView[]): Hits | null {
  let total: Hits | null = null;
  for (const member of members) {
    for (const move of member.moves) {
      const hits = moveHits(member, move);
      if (hits) total = orHits(total ?? NO_HITS, hits);
    }
  }
  return total;
}

/** Offensive problems in Critique order; with no hits at all, every type is uncovered. */
function offensiveProblems(hits: Hits | null, newlyCovered?: Hits): CritiqueProblem[] {
  const { superEffective, neutral } = hits ?? NO_HITS;
  const within = (mask: number, i: number) => (newlyCovered ? (mask >> i) & 1 : 1);
  return [
    ...POKEMON_TYPES.flatMap((type, i): CritiqueProblem[] =>
      !((superEffective >> i) & 1) && within(newlyCovered?.superEffective ?? 0, i) ? [{ kind: 'noSuperEffectiveHit', type }] : [],
    ),
    ...POKEMON_TYPES.flatMap((type, i): CritiqueProblem[] =>
      !((neutral >> i) & 1) && within(newlyCovered?.neutral ?? 0, i) ? [{ kind: 'reducedDamageOnly', type }] : [],
    ),
  ];
}

const bitCount = (n: number) => {
  let count = 0;
  for (; n; n &= n - 1) count++;
  return count;
};

interface MoveOption {
  move: Move;
  moveType: PokemonType;
  hits: Hits;
  stab: boolean;
  aboveBoxEntryLevel: boolean;
}

/** Greedy move choice (see the header): up to MAX_MOVES moves covering the most remaining offensive problems. */
function proposeMoves(options: MoveOption[], base: Hits | null): ProposedMove[] {
  const proposed: ProposedMove[] = [];
  let covered = base ?? NO_HITS;
  const remaining = [...options];
  while (proposed.length < MAX_MOVES) {
    let best: { option: MoveOption; gain: number } | null = null;
    for (const option of remaining) {
      const gain =
        bitCount(option.hits.superEffective & ~covered.superEffective) + bitCount(option.hits.neutral & ~covered.neutral);
      if (gain > 0 && (!best || better(option, gain, best.option, best.gain))) best = { option, gain };
    }
    if (!best) break;
    const { option } = best;
    remaining.splice(remaining.indexOf(option), 1);
    const gained = { superEffective: option.hits.superEffective & ~covered.superEffective, neutral: option.hits.neutral & ~covered.neutral };
    proposed.push({
      move: option.move,
      moveType: option.moveType,
      aboveBoxEntryLevel: option.aboveBoxEntryLevel,
      fixes: offensiveProblems(NO_HITS, gained),
    });
    covered = orHits(covered, option.hits);
  }
  return proposed;
}

const accuracyRank = (move: Move) => (move.accuracy === 0 ? 101 : move.accuracy); // 0: never misses

function better(a: MoveOption, gainA: number, b: MoveOption, gainB: number): boolean {
  return (
    (gainA - gainB ||
      Number(b.aboveBoxEntryLevel) - Number(a.aboveBoxEntryLevel) ||
      Number(a.stab) - Number(b.stab) ||
      a.move.power - b.move.power ||
      accuracyRank(a.move) - accuracyRank(b.move)) > 0
  );
}

/** At most this many Suggestions are returned. */
export const MAX_SUGGESTIONS = 20;

export type SuggestionAction =
  | { kind: 'fill' }
  | { kind: 'replace'; memberId: TeamMemberId; /** The replaced Team Member's Species. */ species: Species };

/** A learnable move proposed for a Suggestion, with the offensive problems it covers. */
export interface ProposedMove {
  move: Move;
  /** The type it hits as, after the candidate's attack-changing Innates (Pixilate: Normal becomes Fairy). */
  moveType: PokemonType;
  /** Offensive problems this move covers that the earlier proposed moves (and the rest of the Team) don't. */
  fixes: CritiqueProblem[];
  /** Learned by level-up only above the Suggestion's Box Entry level (Box Mode); still proposed, ranked after. */
  aboveBoxEntryLevel: boolean;
}

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
  /** Moves to teach it for its offensive fixes, at most MAX_MOVES; empty while offensive problems don't count. */
  proposedMoves: ProposedMove[];
  /**
   * E.g. "fixes: Ground Stacked Weakness, no super-effective hit on Dragon; adds: Ice Stacked Weakness;
   * Ice Beam fixes Dragon gap".
   */
  reason: string;
}

interface Candidate {
  species: Species;
  boxEntryId: BoxEntryId | null;
  plannedEvolution: PlannedEvolution | null;
}

const CANDIDATE_MEMBER_ID = 'suggestion-candidate';

const problemKey = (p: CritiqueProblem): string => ('type' in p ? `${p.kind}:${p.type}` : p.kind);

function countedProblems(team: TeamView, offensive: boolean): Map<string, CritiqueProblem> {
  return new Map(SUGGESTION_SECTIONS.flatMap((section) => section(team, offensive)).map((p) => [problemKey(p), p]));
}

/** "Ice Beam fixes Dragon gap", "Earthquake fixes Fire, Electric gaps": each type once, either problem kind. */
function moveReason({ move, fixes }: ProposedMove): string {
  const types = [...new Set(fixes.flatMap((p) => ('type' in p ? [typeName(p.type)] : [])))];
  return `${move.name} fixes ${types.join(', ')} gap${types.length > 1 ? 's' : ''}`;
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
  const offensive = teamHits(team.members) !== null;
  const before = countedProblems(team, offensive);
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

  const moveOptions = new Map<string, MoveOption[]>();
  const moveOptionsOf = (candidate: Candidate, view: TeamMemberView): MoveOption[] => {
    const key = `${candidate.species.id}|${candidate.boxEntryId ?? ''}`;
    let options = moveOptions.get(key);
    if (!options) {
      const boxEntry = state.box.find((e) => e.id === candidate.boxEntryId) ?? null;
      options = flagLevelUpMoves(learnableMoves(data, candidate.species.id), boxEntry).flatMap(({ move, aboveBoxEntryLevel }) => {
        const hits = moveHits(view, move);
        const moveType = effectiveMoveType(view, move);
        return hits && moveType ? [{ move, moveType, hits, stab: view.types.includes(moveType), aboveBoxEntryLevel }] : [];
      });
      moveOptions.set(key, options);
    }
    return options;
  };

  const ranked: { suggestion: Suggestion; penalised: boolean; bst: number }[] = [];
  for (const { action, others, index } of actions) {
    const othersHits = offensive ? teamHits(others) : null;
    const taken = new Set(others.map((m) => m.species.id));
    const usedEntries = usedBoxEntryIds(others.map((m) => m.member));
    const seen = new Set<string>();
    for (const candidate of pool) {
      const { species } = candidate;
      if (taken.has(species.id) || seen.has(species.id)) continue;
      if (action.kind === 'replace' && action.species.id === species.id) continue;
      if (candidate.boxEntryId && usedEntries.has(candidate.boxEntryId)) continue;
      seen.add(species.id);

      const view = viewOf(species);
      const proposedMoves = offensive ? proposeMoves(moveOptionsOf(candidate, view), othersHits) : [];
      const members = [...others];
      members.splice(index, 0, proposedMoves.length ? { ...view, moves: proposedMoves.map((m) => m.move) } : view);
      const after = countedProblems({ ...team, members, isFull: members.length >= MAX_TEAM_MEMBERS }, offensive);
      const fixes = [...before].filter(([k]) => !after.has(k)).map(([, p]) => p);
      if (fixes.length === 0) continue;
      const introduces = [...after].filter(([k]) => !before.has(k)).map(([, p]) => p);
      const newWeaknesses = POKEMON_TYPES.filter((t) => isWeakness(memoisedMultiplier(view, t)));
      const reason =
        `fixes: ${fixes.map(problemLabel).join(', ')}` +
        (introduces.length ? `; adds: ${introduces.map(problemLabel).join(', ')}` : '') +
        proposedMoves.map((m) => `; ${moveReason(m)}`).join('');
      ranked.push({
        suggestion: { ...candidate, action, fixes, introduces, newWeaknesses, proposedMoves, reason },
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
 * Applies a Suggestion in one action: adds it as a new Team Member, or replaces the named Team Member in its position,
 * with the proposed moves pre-filled. Mode rules apply as for adding a Team Member; the Suggestion's Box Entry is kept.
 */
export function applySuggestion(state: AppState, data: DataSnapshot, teamId: TeamId, suggestion: Suggestion): AppState {
  const placed = placeSuggestion(state, data, teamId, suggestion);
  const added = findTeam(placed, teamId).members.find((m) => !findTeam(state, teamId).members.some((o) => o.id === m.id))!;
  const moveIds = suggestion.proposedMoves.map((m) => m.move.id);
  return moveIds.length ? setTeamMemberMoves(placed, data, teamId, added.id, moveIds) : placed;
}

function placeSuggestion(state: AppState, data: DataSnapshot, teamId: TeamId, suggestion: Suggestion): AppState {
  const boxEntryId = suggestion.boxEntryId ?? undefined;
  if (suggestion.action.kind === 'fill') {
    return addTeamMemberInMode(state, data, teamId, suggestion.species.id, boxEntryId);
  }
  const { memberId } = suggestion.action;
  const index = findTeam(state, teamId).members.findIndex((m) => m.id === memberId);
  const added = addTeamMemberInMode(removeTeamMember(state, teamId, memberId), data, teamId, suggestion.species.id, boxEntryId);
  const newMember = findTeam(added, teamId).members.at(-1)!;
  return moveTeamMember(added, teamId, newMember.id, index);
}
