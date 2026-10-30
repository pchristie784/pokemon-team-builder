import { describe, expect, it } from 'vitest';
import { createTeamBuilder, InMemoryStorage, type SpeciesId } from '../index';

function teamOf(...speciesIds: SpeciesId[]) {
  const builder = createTeamBuilder({ storage: new InMemoryStorage() });
  const teamId = builder.getActiveTeamId();
  for (const id of speciesIds) builder.addTeamMember(teamId, id);
  return { builder, teamId };
}

function defensiveCoverage(...speciesIds: SpeciesId[]) {
  const { builder, teamId } = teamOf(...speciesIds);
  return builder.getCritique(teamId).defensiveCoverage;
}

describe('Defensive Coverage', () => {
  it('reports a Rock Stacked Weakness for a Team with three Rock-weak members', () => {
    // Charizard (Fire/Flying), Butterfree (Bug/Flying), Moltres (Fire/Flying)
    const coverage = defensiveCoverage('SPECIES_CHARIZARD', 'SPECIES_BUTTERFREE', 'SPECIES_MOLTRES');
    expect(coverage.stackedWeaknesses).toContainEqual({ kind: 'stackedWeakness', type: 'TYPE_ROCK' });
  });

  it('counts a Ground/Flying Team Member as immune to Ground', () => {
    const coverage = defensiveCoverage('SPECIES_GLIGAR');
    const ground = coverage.byType.find((t) => t.attackType === 'TYPE_GROUND');
    expect(ground).toMatchObject({ weak: [], resist: [], immune: [expect.any(String)] });
  });

  it('breaks down weak, resist and immune members for each of the 18 attacking types', () => {
    // Gligar (Ground/Flying), Marill (Water/Fairy), Gengar (Ghost/Poison)
    const coverage = defensiveCoverage('SPECIES_GLIGAR', 'SPECIES_MARILL', 'SPECIES_GENGAR');
    expect(coverage.byType).toHaveLength(18);
    const counts = (type: string) => {
      const t = coverage.byType.find((x) => x.attackType === type)!;
      return [t.weak.length, t.resist.length, t.immune.length];
    };
    expect(counts('TYPE_ICE')).toEqual([1, 1, 0]); // Gligar 4x weak, Marill resists
    expect(counts('TYPE_FIGHTING')).toEqual([0, 2, 1]); // Gligar and Marill resist, Gengar immune
  });

  it('reports an Unanswered Type when a Team Member is weak and nobody resists or is immune', () => {
    // Pikachu (Electric) is weak to Ground; Snorlax (Normal) is neutral
    const coverage = defensiveCoverage('SPECIES_PIKACHU', 'SPECIES_SNORLAX');
    expect(coverage.unansweredTypes).toContainEqual({ kind: 'unansweredType', type: 'TYPE_GROUND' });
    expect(coverage.stackedWeaknesses).toEqual([]);
  });

  it('does not report an Unanswered Type when another Team Member is immune to it', () => {
    const coverage = defensiveCoverage('SPECIES_PIKACHU', 'SPECIES_GLIGAR');
    expect(coverage.unansweredTypes).not.toContainEqual({ kind: 'unansweredType', type: 'TYPE_GROUND' });
  });

  it('reports no problems for an empty Team', () => {
    const coverage = defensiveCoverage();
    expect(coverage.stackedWeaknesses).toEqual([]);
    expect(coverage.unansweredTypes).toEqual([]);
    expect(coverage.quadWeaknesses).toEqual([]);
  });

  it('reports a 4x weakness separately, naming the Team Member', () => {
    const { builder, teamId } = teamOf('SPECIES_GLIGAR', 'SPECIES_SNORLAX');
    const gligar = builder.getTeam(teamId).members[0]!;
    const coverage = builder.getCritique(teamId).defensiveCoverage;
    expect(coverage.quadWeaknesses).toEqual([{ kind: 'quadWeakness', memberId: gligar.id, type: 'TYPE_ICE' }]);
  });

  it('counts a 4x weakness once towards Stacked Weakness and Unanswered Type', () => {
    // Gligar is 4x Ice-weak, Snorlax neutral: one weak member, so Unanswered but not Stacked
    const coverage = defensiveCoverage('SPECIES_GLIGAR', 'SPECIES_SNORLAX');
    const ice = coverage.byType.find((t) => t.attackType === 'TYPE_ICE')!;
    expect(ice.weak).toHaveLength(1);
    expect(coverage.unansweredTypes).toContainEqual({ kind: 'unansweredType', type: 'TYPE_ICE' });
    expect(coverage.stackedWeaknesses).not.toContainEqual({ kind: 'stackedWeakness', type: 'TYPE_ICE' });
  });

  it('updates as Team Members are added and removed', () => {
    const { builder, teamId } = teamOf('SPECIES_CHARIZARD', 'SPECIES_BUTTERFREE');
    const rock = { kind: 'stackedWeakness', type: 'TYPE_ROCK' };
    expect(builder.getCritique(teamId).defensiveCoverage.stackedWeaknesses).not.toContainEqual(rock);

    builder.addTeamMember(teamId, 'SPECIES_MOLTRES');
    expect(builder.getCritique(teamId).defensiveCoverage.stackedWeaknesses).toContainEqual(rock);

    const [charizard] = builder.getTeam(teamId).members;
    builder.removeTeamMember(teamId, charizard!.id);
    expect(builder.getCritique(teamId).defensiveCoverage.stackedWeaknesses).not.toContainEqual(rock);
  });
});

describe('Critique problems', () => {
  it('lists each Stacked Weakness and Unanswered Type as an identifiable problem', () => {
    const { builder, teamId } = teamOf('SPECIES_CHARIZARD', 'SPECIES_BUTTERFREE', 'SPECIES_MOLTRES');
    const { problems } = builder.getCritique(teamId);
    expect(problems).toContainEqual({ kind: 'stackedWeakness', type: 'TYPE_ROCK' });
    expect(problems).toContainEqual({ kind: 'unansweredType', type: 'TYPE_ROCK' });
    expect(problems).toContainEqual({ kind: 'unansweredType', type: 'TYPE_ELECTRIC' });
  });
});
