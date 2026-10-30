import { describe, expect, it } from 'vitest';
import { createTeamBuilder, InMemoryStorage, MAX_SUGGESTIONS, type MoveId, type SpeciesId } from '../index';

/** A Team whose members know the given moves. */
function teamWithMoves(...members: [SpeciesId, MoveId[]][]) {
  const builder = createTeamBuilder({ storage: new InMemoryStorage() });
  const teamId = builder.getActiveTeamId();
  for (const [speciesId, moves] of members) {
    builder.addTeamMember(teamId, speciesId);
    const added = builder.getTeam(teamId).members.at(-1)!;
    builder.setTeamMemberMoves(teamId, added.id, moves);
  }
  return { builder, teamId };
}

const FULL_WITH_MOVES: [SpeciesId, MoveId[]][] = [
  ['SPECIES_GOLEM', ['MOVE_EARTHQUAKE']],
  ['SPECIES_RHYDON', ['MOVE_ROCK_SLIDE']],
  ['SPECIES_STEELIX', ['MOVE_IRON_TAIL']],
  ['SPECIES_MACHAMP', ['MOVE_CROSS_CHOP']],
  ['SPECIES_DONPHAN', ['MOVE_EARTHQUAKE']],
  ['SPECIES_URSARING', ['MOVE_ICE_PUNCH']],
];

const DRAGON_GAP = { kind: 'noSuperEffectiveHit', type: 'TYPE_DRAGON' } as const;

describe('Suggestions for Offensive Coverage gaps', () => {
  // Arcanine's Flamethrower and Golem's Earthquake: neither hits Dragon super-effectively.
  const NO_ANSWER_TO_DRAGON: [SpeciesId, MoveId[]][] = [
    ['SPECIES_ARCANINE', ['MOVE_FLAMETHROWER']],
    ['SPECIES_GOLEM', ['MOVE_EARTHQUAKE']],
  ];

  it('a Team with no answer to Dragon gets a Suggestion naming an Ice, Dragon or Fairy move, with the Dragon gap as its reason', () => {
    const { builder, teamId } = teamWithMoves(...NO_ANSWER_TO_DRAGON);
    expect(builder.getCritique(teamId).problems).toContainEqual(DRAGON_GAP);

    const fixesDragon = (fixes: { kind: string; type?: string }[]) => fixes.some((p) => p.kind === DRAGON_GAP.kind && p.type === DRAGON_GAP.type);
    const dragonFixers = builder.suggest(teamId).filter((s) => fixesDragon(s.fixes));
    // Every Suggestion credited with the Dragon gap names the move that covers it in its reason...
    expect(dragonFixers.length).toBeGreaterThan(0);
    const dragonMoves = dragonFixers.map((s) => {
      const move = s.proposedMoves.find((m) => fixesDragon(m.fixes))!;
      expect(s.reason).toMatch(new RegExp(`${move.move.name} fixes [^;]*Dragon`));
      return move.moveType;
    });
    // ...and some of them do it with an Ice, Dragon or Fairy move (others via Innates like Omega's).
    expect(dragonMoves.some((t) => ['TYPE_ICE', 'TYPE_DRAGON', 'TYPE_FAIRY'].includes(t))).toBe(true);
  });

  /** The no-answer-to-Dragon Team in Box Mode, with a Cleffa (whose Clefable has a Pixilate Innate) in the Box. */
  function withCleffaInBox() {
    const { builder, teamId } = teamWithMoves(...NO_ANSWER_TO_DRAGON);
    builder.addBoxEntry('SPECIES_CLEFFA', 5);
    builder.setMode('BOX');
    const clefable = builder.suggest(teamId).find((s) => s.species.id === 'SPECIES_CLEFABLE')!;
    return { builder, teamId, clefable };
  }

  it("credits a Pixilate Innate candidate's Normal move as Fairy against the Dragon gap", () => {
    const { clefable } = withCleffaInBox();
    const dragonMove = clefable.proposedMoves.find((m) => m.fixes.some((p) => p.kind === DRAGON_GAP.kind && p.type === DRAGON_GAP.type))!;
    expect(dragonMove.move.type).toBe('TYPE_NORMAL');
    expect(dragonMove.moveType).toBe('TYPE_FAIRY');
    expect(clefable.fixes).toContainEqual(DRAGON_GAP);
  });

  it('adding a Suggestion pre-fills its proposed moves, which then cover the gaps it was credited with', () => {
    const { builder, teamId, clefable } = withCleffaInBox();
    builder.applySuggestion(teamId, clefable);

    const added = builder.getTeam(teamId).members[2]!;
    expect(added.species.id).toBe('SPECIES_CLEFABLE');
    expect(added.moves.map((m) => m.id)).toEqual(clefable.proposedMoves.map((m) => m.move.id));
    const problems = builder.getCritique(teamId).problems;
    for (const fixed of clefable.fixes) expect(problems).not.toContainEqual(fixed);
  });

  describe('ranking', () => {
    const OFFENSIVE_KINDS = ['noSuperEffectiveHit', 'reducedDamageOnly'];
    /** Arcanine and Golem (with or without their moves) and a Box to suggest from. */
    function suggestFromBox(withMoves: boolean) {
      const { builder, teamId } = withMoves
        ? teamWithMoves(...NO_ANSWER_TO_DRAGON)
        : teamWithMoves(...NO_ANSWER_TO_DRAGON.map(([species]): [SpeciesId, MoveId[]] => [species, []]));
      for (const id of ['SPECIES_POLIWRATH', 'SPECIES_CROBAT', 'SPECIES_GRAVELER'] as const) builder.addBoxEntry(id);
      builder.setMode('BOX');
      return builder.suggest(teamId);
    }
    const names = (suggestions: { species: { displayName: string } }[]) => suggestions.map((s) => s.species.displayName);

    it('counts offensive fixes: a candidate covering more gaps outranks one with more defensive fixes', () => {
      // Without moves, Crobat (Fighting Unanswered Type, no Fast member) outranks Poliwrath (Water Unanswered Type).
      expect(names(suggestFromBox(false))).toEqual(['Crobat', 'Poliwrath']);
      // With moves, Poliwrath's proposed moves cover more of the Team's gaps than Crobat's, and
      // Graveler, which fixes no defensive or role problem, is suggested for its offensive fixes alone.
      const suggestions = suggestFromBox(true);
      expect(names(suggestions).filter((n) => n !== 'Graveler')).toEqual(['Poliwrath', 'Crobat']);
      const graveler = suggestions.find((s) => s.species.id === 'SPECIES_GRAVELER')!;
      expect(graveler.fixes.length).toBeGreaterThan(0);
      for (const p of graveler.fixes) expect(OFFENSIVE_KINDS).toContain(p.kind);
    });

    it('a Team with no damaging moves gets no offensive fixes, introduced offensive problems or proposed moves', () => {
      for (const s of suggestFromBox(false)) {
        expect(s.proposedMoves).toEqual([]);
        for (const p of [...s.fixes, ...s.introduces]) expect(OFFENSIVE_KINDS).not.toContain(p.kind);
      }
    });
  });

  it('suggests for a full Team with moves in Dex Mode, proposing moves, within budget', () => {
    const { builder, teamId } = teamWithMoves(...FULL_WITH_MOVES);
    builder.suggest(teamId); // warm up
    const start = performance.now();
    const suggestions = builder.suggest(teamId);
    const elapsed = performance.now() - start;
    expect(suggestions).toHaveLength(MAX_SUGGESTIONS);
    expect(suggestions.every((s) => s.proposedMoves.length > 0)).toBe(true);
    expect(elapsed).toBeLessThan(500); // ~160 ms locally; generous for slow CI machines
  });

  it("on a full Team, a replace Suggestion's fixes and introduced problems match the Critique once applied, the replaced member's moves gone", () => {
    // Rhydon's Rock Slide is the Team's only Rock move: replacing Rhydon loses its coverage.
    const FULL = FULL_WITH_MOVES;
    const key = (p: { kind: string; type?: string }) => `${p.kind}:${p.type ?? ''}`;
    const { builder, teamId } = teamWithMoves(...FULL);
    const before = builder.getCritique(teamId).problems.map(key);
    const suggestions = builder.suggest(teamId);
    expect(suggestions.some((s) => s.action.kind === 'replace' && s.action.species.id === 'SPECIES_RHYDON')).toBe(true);
    for (const s of suggestions) {
      const fresh = teamWithMoves(...FULL);
      const action = s.action.kind === 'replace' ? s.action : null;
      if (!action) throw new Error('expected a replace Suggestion');
      const memberIndex = builder.getTeam(teamId).members.findIndex((m) => m.id === action.memberId);
      fresh.builder.applySuggestion(fresh.teamId, { ...s, action: { ...action, memberId: fresh.builder.getTeam(fresh.teamId).members[memberIndex]!.id } });
      const after = fresh.builder.getCritique(fresh.teamId).problems.map(key).sort();
      const expected = [...before.filter((k) => !s.fixes.map(key).includes(k)), ...s.introduces.map(key)].sort();
      expect(after, s.species.displayName).toEqual(expected);
    }
  });
});
