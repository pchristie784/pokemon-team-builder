import { describe, expect, it } from 'vitest';
import { createTeamBuilder, InMemoryStorage, type PokemonType, type SpeciesId } from '../index';

function teamOf(...speciesIds: SpeciesId[]) {
  const builder = createTeamBuilder({ storage: new InMemoryStorage() });
  const teamId = builder.getActiveTeamId();
  for (const id of speciesIds) builder.addTeamMember(teamId, id);
  const memberIds = builder.getTeam(teamId).members.map((m) => m.id);
  return { builder, teamId, memberIds };
}

function typeDefense(builder: ReturnType<typeof teamOf>['builder'], teamId: string, type: PokemonType) {
  return builder.getCritique(teamId).defensiveCoverage.byType.find((t) => t.attackType === type)!;
}

describe('Innates in Defensive Coverage', () => {
  it("counts a Thick Fat Innate as a Fire and Ice resistance", () => {
    // Crabrawler (Fighting) has Thick Fat as an Innate: Fire 1x -> 0.5x, Ice 0.5x -> 0.25x
    const { builder, teamId, memberIds } = teamOf('SPECIES_CRABRAWLER');
    expect(typeDefense(builder, teamId, 'TYPE_FIRE').resist).toEqual(memberIds);
    expect(typeDefense(builder, teamId, 'TYPE_ICE').resist).toEqual(memberIds);
  });

  it('counts a Levitate Innate as a Ground immunity, so it no longer adds to a Ground Stacked Weakness', () => {
    // Pikachu and Raichu (Electric) are Ground-weak; Gengar (Ghost/Poison) would be too, but has a Levitate Innate
    const { builder, teamId, memberIds } = teamOf('SPECIES_PIKACHU', 'SPECIES_RAICHU', 'SPECIES_GENGAR');
    const ground = typeDefense(builder, teamId, 'TYPE_GROUND');
    expect(ground.immune).toEqual([memberIds[2]]);
    expect(ground.weak).toHaveLength(2);
    expect(builder.getCritique(teamId).defensiveCoverage.stackedWeaknesses).not.toContainEqual({
      kind: 'stackedWeakness',
      type: 'TYPE_GROUND',
    });
  });

  it('ignores Innates that are not in the ability effects table', () => {
    // Marill (Water/Fairy): Innates Cheek Pouch and Water Veil do not touch type matchups
    const { builder, teamId } = teamOf('SPECIES_MARILL');
    const coverage = builder.getCritique(teamId).defensiveCoverage;
    const summary = Object.fromEntries(
      coverage.byType.map((t) => [t.attackType, t.weak.length ? 'weak' : t.resist.length ? 'resist' : t.immune.length ? 'immune' : 'neutral']),
    );
    expect(summary).toMatchObject({
      TYPE_GRASS: 'weak', TYPE_ELECTRIC: 'weak', TYPE_POISON: 'weak',
      TYPE_FIRE: 'resist', TYPE_WATER: 'resist', TYPE_ICE: 'resist', TYPE_FIGHTING: 'resist', TYPE_BUG: 'resist',
      TYPE_DARK: 'resist', TYPE_STEEL: 'neutral', TYPE_DRAGON: 'immune', TYPE_NORMAL: 'neutral', TYPE_GROUND: 'neutral',
    });
  });
});

describe("Soulgold's own type-matchup abilities", () => {
  it('counts a Fae Soul Innate as an extra Fairy type, e.g. Milotic becomes immune to Dragon', () => {
    const { builder, teamId, memberIds } = teamOf('SPECIES_MILOTIC');
    expect(typeDefense(builder, teamId, 'TYPE_DRAGON').immune).toEqual(memberIds);
    expect(typeDefense(builder, teamId, 'TYPE_POISON').weak).toEqual(memberIds);
  });

  it("counts an Inversion Innate as reversing weaknesses and resistances, keeping immunities", () => {
    // Torterra (Grass/Ground): Ice 4x and Fire 2x become resisted, Rock 0.5x becomes 2x, Electric stays immune
    const { builder, teamId, memberIds } = teamOf('SPECIES_TORTERRA');
    expect(typeDefense(builder, teamId, 'TYPE_ICE').resist).toEqual(memberIds);
    expect(typeDefense(builder, teamId, 'TYPE_FIRE').resist).toEqual(memberIds);
    expect(typeDefense(builder, teamId, 'TYPE_ELECTRIC').immune).toEqual(memberIds);
    expect(typeDefense(builder, teamId, 'TYPE_ROCK').weak).toEqual(memberIds);
    expect(builder.getCritique(teamId).defensiveCoverage.quadWeaknesses).toEqual([]);
  });
});

describe('Choosing an Ability', () => {
  it("lists a Team Member's regular and hidden abilities, each once", () => {
    // Vibrava's data lists Levitate twice
    const { builder, teamId, memberIds } = teamOf('SPECIES_MARILL', 'SPECIES_VIBRAVA');
    expect(builder.getAbilityOptions(teamId, memberIds[0]!).map((o) => [o.ability.name, o.hidden])).toEqual([
      ['Thick Fat', false],
      ['Huge Power', false],
      ['Sap Sipper', true],
    ]);
    const vibrava = builder.getAbilityOptions(teamId, memberIds[1]!).map((o) => o.ability.id);
    expect(vibrava.filter((id) => id === 'ABILITY_LEVITATE')).toHaveLength(1);
  });

  it('applies the chosen Ability once selected, and stops when cleared', () => {
    // Weezing (Poison) is Ground-weak; its regular Ability Levitate makes it immune
    const { builder, teamId, memberIds } = teamOf('SPECIES_WEEZING', 'SPECIES_PIKACHU', 'SPECIES_RAICHU');
    const groundStack = { kind: 'stackedWeakness', type: 'TYPE_GROUND' };
    expect(builder.getCritique(teamId).defensiveCoverage.stackedWeaknesses).toContainEqual(groundStack);

    builder.setTeamMemberAbility(teamId, memberIds[0]!, 'ABILITY_LEVITATE');
    expect(builder.getTeam(teamId).members[0]!.ability?.name).toBe('Levitate');
    expect(typeDefense(builder, teamId, 'TYPE_GROUND').immune).toEqual([memberIds[0]]);
    expect(builder.getCritique(teamId).defensiveCoverage.stackedWeaknesses).not.toContainEqual(groundStack);

    builder.setTeamMemberAbility(teamId, memberIds[0]!, null);
    expect(builder.getTeam(teamId).members[0]!.ability).toBeNull();
    expect(builder.getCritique(teamId).defensiveCoverage.stackedWeaknesses).toContainEqual(groundStack);
  });

  it("applies a chosen hidden Ability, e.g. Marill's Sap Sipper makes it immune to Grass", () => {
    const { builder, teamId, memberIds } = teamOf('SPECIES_MARILL');
    builder.setTeamMemberAbility(teamId, memberIds[0]!, 'ABILITY_SAP_SIPPER');
    expect(typeDefense(builder, teamId, 'TYPE_GRASS').immune).toEqual(memberIds);
  });

  it("rejects an Ability that is not one of the Species' regular or hidden abilities", () => {
    const { builder, teamId, memberIds } = teamOf('SPECIES_MARILL');
    expect(() => builder.setTeamMemberAbility(teamId, memberIds[0]!, 'ABILITY_LEVITATE')).toThrowError(
      expect.objectContaining({ code: 'INVALID_ABILITY' }),
    );
    // An Innate is always on, so it is not a choosable Ability either
    expect(() => builder.setTeamMemberAbility(teamId, memberIds[0]!, 'ABILITY_CHEEK_POUCH')).toThrowError(
      expect.objectContaining({ code: 'INVALID_ABILITY' }),
    );
    expect(builder.getTeam(teamId).members[0]!.member.abilityId).toBeNull();
  });

  it('keeps the chosen Ability across a reload', () => {
    const storage = new InMemoryStorage();
    const builder = createTeamBuilder({ storage });
    const teamId = builder.getActiveTeamId();
    builder.addTeamMember(teamId, 'SPECIES_WEEZING');
    const memberId = builder.getTeam(teamId).members[0]!.id;
    builder.setTeamMemberAbility(teamId, memberId, 'ABILITY_LEVITATE');

    const reloaded = createTeamBuilder({ storage });
    expect(reloaded.getTeam(teamId).members[0]!.ability?.id).toBe('ABILITY_LEVITATE');
  });
});
