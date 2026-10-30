import { describe, expect, it } from 'vitest';
import { createTeamBuilder, InMemoryStorage, isDomainError, type SpeciesId } from '../index';

function teamOf(...speciesIds: SpeciesId[]) {
  const builder = createTeamBuilder({ storage: new InMemoryStorage() });
  const teamId = builder.getActiveTeamId();
  for (const id of speciesIds) builder.addTeamMember(teamId, id);
  const memberIds = builder.getTeam(teamId).members.map((m) => m.id);
  return { builder, teamId, memberIds };
}

function expectDomainError(code: string, action: () => void) {
  try {
    action();
  } catch (error) {
    expect(isDomainError(error) && error.code).toBe(code);
    return;
  }
  throw new Error(`expected DomainError ${code}`);
}

describe('Learnable moves', () => {
  const { builder } = teamOf();
  const pikachu = builder.getLearnableMoves('SPECIES_PIKACHU');
  const find = (moveId: string) => pikachu.find((m) => m.move.id === moveId);

  it('labels a level-up move with its level', () => {
    expect(find('MOVE_THUNDER_WAVE')?.sources).toContainEqual({ kind: 'levelUp', level: 4 });
  });

  it('labels a TM move with its machine label', () => {
    expect(find('MOVE_CALM_MIND')?.sources).toEqual([{ kind: 'machine', label: 'TM04' }]);
  });

  it('labels tutor and egg moves', () => {
    expect(find('MOVE_SEISMIC_TOSS')?.sources).toEqual([{ kind: 'tutor' }]);
    expect(find('MOVE_REVERSAL')?.sources).toEqual([{ kind: 'egg' }]);
  });

  it('lists every source of a move learnable several ways, once', () => {
    const thunderbolt = find('MOVE_THUNDERBOLT')!;
    expect(thunderbolt.sources).toContainEqual({ kind: 'levelUp', level: 36 });
    expect(thunderbolt.sources).toContainEqual({ kind: 'machine', label: expect.stringMatching(/^TM\d+$/) });
    expect(pikachu.filter((m) => m.move.id === 'MOVE_THUNDERBOLT')).toHaveLength(1);
  });

  it('shows each move with its type, category, power and accuracy', () => {
    expect(find('MOVE_THUNDERBOLT')?.move).toMatchObject({
      type: 'TYPE_ELECTRIC',
      category: 'special',
      power: 90,
      accuracy: 100,
    });
  });
});

describe('Team Member moves', () => {
  const movesOf = (builder: ReturnType<typeof teamOf>['builder'], teamId: string) =>
    builder.getTeam(teamId).members[0]!.member.moves;

  it('chooses up to four learnable moves for a Team Member', () => {
    const { builder, teamId, memberIds } = teamOf('SPECIES_PIKACHU');
    const four = ['MOVE_THUNDERBOLT', 'MOVE_SURF', 'MOVE_GRASS_KNOT', 'MOVE_THUNDER_WAVE'];
    builder.setTeamMemberMoves(teamId, memberIds[0]!, four);
    expect(movesOf(builder, teamId)).toEqual(four);
  });

  it('rejects a fifth move', () => {
    const { builder, teamId, memberIds } = teamOf('SPECIES_PIKACHU');
    for (const m of ['MOVE_THUNDERBOLT', 'MOVE_SURF', 'MOVE_GRASS_KNOT', 'MOVE_THUNDER_WAVE']) {
      builder.addTeamMemberMove(teamId, memberIds[0]!, m);
    }
    expectDomainError('TOO_MANY_MOVES', () => builder.addTeamMemberMove(teamId, memberIds[0]!, 'MOVE_IRON_TAIL'));
    expectDomainError('TOO_MANY_MOVES', () =>
      builder.setTeamMemberMoves(teamId, memberIds[0]!, [
        'MOVE_THUNDERBOLT', 'MOVE_SURF', 'MOVE_GRASS_KNOT', 'MOVE_THUNDER_WAVE', 'MOVE_IRON_TAIL',
      ]),
    );
    expect(movesOf(builder, teamId)).toHaveLength(4);
  });

  it('rejects a move the Species cannot learn', () => {
    const { builder, teamId, memberIds } = teamOf('SPECIES_PIKACHU');
    expectDomainError('MOVE_NOT_LEARNABLE', () => builder.addTeamMemberMove(teamId, memberIds[0]!, 'MOVE_FLAMETHROWER'));
    expectDomainError('MOVE_NOT_LEARNABLE', () => builder.addTeamMemberMove(teamId, memberIds[0]!, 'MOVE_NOT_A_MOVE'));
  });

  it('rejects the same move twice', () => {
    const { builder, teamId, memberIds } = teamOf('SPECIES_PIKACHU');
    builder.addTeamMemberMove(teamId, memberIds[0]!, 'MOVE_SURF');
    expectDomainError('DUPLICATE_MOVE', () => builder.addTeamMemberMove(teamId, memberIds[0]!, 'MOVE_SURF'));
    expectDomainError('DUPLICATE_MOVE', () =>
      builder.setTeamMemberMoves(teamId, memberIds[0]!, ['MOVE_SURF', 'MOVE_SURF']),
    );
  });

  it('removes a chosen move', () => {
    const { builder, teamId, memberIds } = teamOf('SPECIES_PIKACHU');
    builder.setTeamMemberMoves(teamId, memberIds[0]!, ['MOVE_SURF', 'MOVE_THUNDERBOLT']);
    builder.removeTeamMemberMove(teamId, memberIds[0]!, 'MOVE_SURF');
    expect(movesOf(builder, teamId)).toEqual(['MOVE_THUNDERBOLT']);
  });

  it('shows the chosen moves on the Team Member view', () => {
    const { builder, teamId, memberIds } = teamOf('SPECIES_PIKACHU');
    builder.setTeamMemberMoves(teamId, memberIds[0]!, ['MOVE_SURF']);
    expect(builder.getTeam(teamId).members[0]!.moves).toMatchObject([{ id: 'MOVE_SURF', type: 'TYPE_WATER' }]);
  });
});

describe('Offensive Coverage', () => {
  function snorlaxWith(...moves: string[]) {
    const team = teamOf('SPECIES_SNORLAX');
    team.builder.setTeamMemberMoves(team.teamId, team.memberIds[0]!, moves);
    return team;
  }
  const coverageOf = ({ builder, teamId }: ReturnType<typeof teamOf>) => builder.getCritique(teamId).offensiveCoverage;
  const reduced = (t: ReturnType<typeof teamOf>) => coverageOf(t).typesHitOnlyAtReducedDamage.map((p) => p.type);

  it('flags Rock, Ghost and Steel for a Team with only Normal moves', () => {
    const team = snorlaxWith('MOVE_BODY_SLAM', 'MOVE_DOUBLE_EDGE');
    expect(reduced(team).sort()).toEqual(['TYPE_GHOST', 'TYPE_ROCK', 'TYPE_STEEL']);
    const problems = team.builder.getCritique(team.teamId).problems;
    expect(problems).toContainEqual({ kind: 'reducedDamageOnly', type: 'TYPE_GHOST' });
    expect(problems).toContainEqual({ kind: 'noSuperEffectiveHit', type: 'TYPE_ROCK' });
    expect(coverageOf(team).typesWithoutSuperEffectiveHit).toHaveLength(18);
  });

  it('covers Rock and Steel super-effectively once Earthquake is added, traced to the Team Member and move', () => {
    const team = snorlaxWith('MOVE_BODY_SLAM', 'MOVE_EARTHQUAKE');
    expect(reduced(team)).toEqual([]);
    const rock = coverageOf(team).byType.find((t) => t.defendType === 'TYPE_ROCK')!;
    expect(rock.multiplier).toBe(2);
    expect(rock.sources).toEqual([{ memberId: team.memberIds[0], moveId: 'MOVE_EARTHQUAKE', moveType: 'TYPE_GROUND' }]);
    const ghost = coverageOf(team).byType.find((t) => t.defendType === 'TYPE_GHOST')!;
    expect(ghost.multiplier).toBe(1); // Earthquake hits Ghost neutrally; Body Slam doesn't
    expect(coverageOf(team).typesWithoutSuperEffectiveHit.map((p) => p.type)).not.toContain('TYPE_STEEL');
  });

  it('traces a type to every Team Member and move achieving the best multiplier', () => {
    const team = teamOf('SPECIES_SNORLAX', 'SPECIES_DUGTRIO');
    team.builder.setTeamMemberMoves(team.teamId, team.memberIds[0]!, ['MOVE_EARTHQUAKE', 'MOVE_THUNDERBOLT']);
    team.builder.setTeamMemberMoves(team.teamId, team.memberIds[1]!, ['MOVE_EARTHQUAKE']);
    const steel = coverageOf(team).byType.find((t) => t.defendType === 'TYPE_STEEL')!;
    expect(steel.sources.map((s) => s.memberId)).toEqual(team.memberIds);
    const water = coverageOf(team).byType.find((t) => t.defendType === 'TYPE_WATER')!;
    expect(water.sources).toEqual([{ memberId: team.memberIds[0], moveId: 'MOVE_THUNDERBOLT', moveType: 'TYPE_ELECTRIC' }]);
  });

  it('ignores status moves and fixed-damage moves', () => {
    // Curse is a Ghost status move; Seismic Toss is a fixed-damage Fighting move.
    const team = snorlaxWith('MOVE_BODY_SLAM', 'MOVE_CURSE', 'MOVE_SEISMIC_TOSS');
    expect(reduced(team).sort()).toEqual(['TYPE_GHOST', 'TYPE_ROCK', 'TYPE_STEEL']);
  });

  it('flags nothing while the Team has no damaging moves', () => {
    const team = snorlaxWith('MOVE_CURSE');
    const coverage = coverageOf(team);
    expect(coverage.typesWithoutSuperEffectiveHit).toEqual([]);
    expect(coverage.typesHitOnlyAtReducedDamage).toEqual([]);
    expect(coverage.byType.every((t) => t.multiplier === null && t.sources.length === 0)).toBe(true);
  });
});
