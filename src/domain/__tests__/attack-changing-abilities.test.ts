import { describe, expect, it } from 'vitest';
import { createTeamBuilder, InMemoryStorage, type AbilityId, type MoveId, type PokemonType, type SpeciesId } from '../index';

/** A one-member Team with the given moves (and optionally a chosen Ability); returns its Offensive Coverage. */
function coverageOf(speciesId: SpeciesId, moves: MoveId[], abilityId?: AbilityId) {
  const builder = createTeamBuilder({ storage: new InMemoryStorage() });
  const teamId = builder.getActiveTeamId();
  builder.addTeamMember(teamId, speciesId);
  const memberId = builder.getTeam(teamId).members[0]!.id;
  builder.setTeamMemberMoves(teamId, memberId, moves);
  if (abilityId) builder.setTeamMemberAbility(teamId, memberId, abilityId);
  const coverage = builder.getCritique(teamId).offensiveCoverage;
  const against = (type: PokemonType) => coverage.byType.find((t) => t.defendType === type)!;
  return { memberId, coverage, against };
}

describe('Attack-changing abilities in Offensive Coverage', () => {
  it("counts a Pixilate Innate member's Normal move as Fairy coverage against Dragon", () => {
    const { against, memberId } = coverageOf('SPECIES_CLEFABLE', ['MOVE_BODY_SLAM']);
    expect(against('TYPE_DRAGON').multiplier).toBe(2);
    expect(against('TYPE_DRAGON').sources).toEqual([{ memberId, moveId: 'MOVE_BODY_SLAM', moveType: 'TYPE_FAIRY' }]);
    expect(against('TYPE_GHOST').multiplier).toBe(1); // a Fairy move, so no longer stopped by Ghost
  });

  it('converts Normal moves from the chosen Ability, and only while it is chosen', () => {
    const chosen = coverageOf('SPECIES_GOLEM_ALOLA', ['MOVE_BODY_SLAM'], 'ABILITY_GALVANIZE');
    expect(chosen.against('TYPE_WATER').multiplier).toBe(2);
    expect(chosen.against('TYPE_WATER').sources[0]!.moveType).toBe('TYPE_ELECTRIC');
    const unchosen = coverageOf('SPECIES_GOLEM_ALOLA', ['MOVE_BODY_SLAM']);
    expect(unchosen.against('TYPE_WATER').sources[0]!.moveType).toBe('TYPE_NORMAL');
  });

  it('leaves non-Normal moves of a converting member unchanged', () => {
    const { against } = coverageOf('SPECIES_GOLEM_ALOLA', ['MOVE_EARTHQUAKE'], 'ABILITY_GALVANIZE');
    expect(against('TYPE_FLYING').multiplier).toBe(0);
    expect(against('TYPE_FLYING').sources[0]!.moveType).toBe('TYPE_GROUND');
  });

  it("converts a Soulgold \"-ate\" Innate's Normal moves (Rotom Heat's Fire-ate)", () => {
    const { against } = coverageOf('SPECIES_ROTOM_HEAT', ['MOVE_UPROAR']);
    expect(against('TYPE_GRASS').sources[0]!.moveType).toBe('TYPE_FIRE');
    expect(against('TYPE_GRASS').multiplier).toBe(2);
  });

  it('lets a Scrappy Innate member hit Ghost with Normal moves', () => {
    const { against, coverage } = coverageOf('SPECIES_EEVEE', ['MOVE_BODY_SLAM']);
    expect(against('TYPE_GHOST').multiplier).toBe(1);
    expect(coverage.typesHitOnlyAtReducedDamage.map((p) => p.type).sort()).toEqual(['TYPE_ROCK', 'TYPE_STEEL']);
  });

  it("lets Mind's Eye hit Ghost with Normal and Fighting moves (Medicham)", () => {
    const { against } = coverageOf('SPECIES_MEDICHAM', ['MOVE_BRICK_BREAK']);
    expect(against('TYPE_GHOST').multiplier).toBe(1);
    expect(against('TYPE_DARK').multiplier).toBe(2);
  });

  it('treats resisted hits as neutral for a Tinted Lens Innate member, but keeps immunities', () => {
    const { against, coverage } = coverageOf('SPECIES_FLYGON', ['MOVE_EARTHQUAKE']);
    expect(against('TYPE_GRASS').multiplier).toBe(1);
    expect(against('TYPE_BUG').multiplier).toBe(1);
    expect(against('TYPE_FLYING').multiplier).toBe(0);
    expect(coverage.typesHitOnlyAtReducedDamage.map((p) => p.type)).toEqual(['TYPE_FLYING']);
  });

  it('applies Tinted Lens from the chosen Ability', () => {
    const { against } = coverageOf('SPECIES_BUTTERFREE', ['MOVE_BUG_BUZZ'], 'ABILITY_TINTED_LENS');
    expect(against('TYPE_FIRE').multiplier).toBe(1);
    expect(against('TYPE_PSYCHIC').multiplier).toBe(2);
  });

  it("makes an Acidic Innate member's Poison moves super effective against Steel (Muk)", () => {
    const { against } = coverageOf('SPECIES_MUK', ['MOVE_SLUDGE_BOMB']);
    expect(against('TYPE_STEEL').multiplier).toBe(2);
    expect(against('TYPE_GROUND').multiplier).toBe(0.5);
  });

  it("turns a Liquid Voice Innate member's sound moves into Water moves, and only those (Lapras)", () => {
    const { against } = coverageOf('SPECIES_LAPRAS', ['MOVE_HYPER_VOICE', 'MOVE_BODY_SLAM']);
    expect(against('TYPE_FIRE').multiplier).toBe(2);
    expect(against('TYPE_FIRE').sources.map((s) => [s.moveId, s.moveType])).toEqual([['MOVE_HYPER_VOICE', 'TYPE_WATER']]);
    expect(against('TYPE_GHOST').sources.map((s) => [s.moveId, s.moveType])).toEqual([['MOVE_HYPER_VOICE', 'TYPE_WATER']]);
  });

  it("converts Normal moves with a toggled-on Mega's Ability (Gardevoir's Mega has Pixilate)", () => {
    const builder = createTeamBuilder({ storage: new InMemoryStorage() });
    const teamId = builder.getActiveTeamId();
    builder.addTeamMember(teamId, 'SPECIES_GARDEVOIR');
    const memberId = builder.getTeam(teamId).members[0]!.id;
    builder.setTeamMemberMoves(teamId, memberId, ['MOVE_BODY_SLAM']);
    const dragon = () =>
      builder.getCritique(teamId).offensiveCoverage.byType.find((t) => t.defendType === 'TYPE_DRAGON')!;
    expect(dragon().sources[0]!.moveType).toBe('TYPE_NORMAL');
    builder.setTeamMemberMega(teamId, memberId, 'SPECIES_GARDEVOIR_MEGA');
    expect(dragon().sources[0]!.moveType).toBe('TYPE_FAIRY');
    expect(dragon().multiplier).toBe(2);
  });

  it("makes an Omega Innate member's attacks super effective, except against immunities (Arceus)", () => {
    const { against } = coverageOf('SPECIES_ARCEUS_NORMAL', ['MOVE_EARTHQUAKE']);
    expect(against('TYPE_BUG').multiplier).toBe(2);
    expect(against('TYPE_WATER').multiplier).toBe(2);
    expect(against('TYPE_FLYING').multiplier).toBe(0);
  });
});
