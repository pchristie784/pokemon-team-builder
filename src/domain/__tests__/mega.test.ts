import { describe, expect, it } from 'vitest';
import { createTeamBuilder, InMemoryStorage, STORAGE_KEY, type SpeciesId } from '../index';

function teamOf(...speciesIds: SpeciesId[]) {
  const builder = createTeamBuilder({ storage: new InMemoryStorage() });
  const teamId = builder.getActiveTeamId();
  for (const id of speciesIds) builder.addTeamMember(teamId, id);
  const memberIds = builder.getTeam(teamId).members.map((m) => m.id);
  return { builder, teamId, memberIds };
}

describe('Mega availability', () => {
  it('offers each Mega of a Species with several, by name and Mega Stone', () => {
    const { builder } = teamOf();
    const megas = builder.getMegaOptions('SPECIES_CHARIZARD');
    expect(megas.map((m) => [m.id, m.displayName, m.itemName])).toEqual([
      ['SPECIES_CHARIZARD_MEGA_X', 'Charizard X', 'Dragotite'],
      ['SPECIES_CHARIZARD_MEGA_Y', 'Charizard Y', expect.any(String)],
    ]);
  });

  it('offers no Mega for a Species without one', () => {
    const { builder } = teamOf();
    expect(builder.getMegaOptions('SPECIES_PIKACHU')).toEqual([]);
  });
});

describe('Mega toggle', () => {
  it("swaps in the Mega's typing, which changes Defensive Coverage", () => {
    // Charizard (Fire/Flying) takes 4x from Rock and 2x from Electric; Charizard X (Fire/Dragon) doesn't.
    const { builder, teamId, memberIds } = teamOf('SPECIES_CHARIZARD');
    const [zard] = memberIds as [string];
    const rock = () => builder.getCritique(teamId).defensiveCoverage.byType.find((t) => t.attackType === 'TYPE_ROCK')!;
    const electric = () => builder.getCritique(teamId).defensiveCoverage.byType.find((t) => t.attackType === 'TYPE_ELECTRIC')!;
    expect(builder.getCritique(teamId).defensiveCoverage.quadWeaknesses).toContainEqual({ kind: 'quadWeakness', memberId: zard, type: 'TYPE_ROCK' });
    expect(electric().weak).toContain(zard);

    builder.setTeamMemberMega(teamId, zard, 'SPECIES_CHARIZARD_MEGA_X');

    expect(builder.getTeam(teamId).members[0]!.types).toEqual(['TYPE_FIRE', 'TYPE_DRAGON']);
    expect(builder.getCritique(teamId).defensiveCoverage.quadWeaknesses).toEqual([]);
    expect(rock().weak).toContain(zard);
    expect(electric().resist).toContain(zard);
  });

  it('turning Mega off restores the Species typing', () => {
    const { builder, teamId, memberIds } = teamOf('SPECIES_CHARIZARD');
    builder.setTeamMemberMega(teamId, memberIds[0]!, 'SPECIES_CHARIZARD_MEGA_X');
    builder.setTeamMemberMega(teamId, memberIds[0]!, null);
    const member = builder.getTeam(teamId).members[0]!;
    expect(member.types).toEqual(['TYPE_FIRE', 'TYPE_FLYING']);
    expect(member.mega).toBeNull();
  });
});

describe('One Mega per Team', () => {
  it('rejects a second Mega on the same Team', () => {
    const { builder, teamId, memberIds } = teamOf('SPECIES_CHARIZARD', 'SPECIES_VENUSAUR');
    builder.setTeamMemberMega(teamId, memberIds[0]!, 'SPECIES_CHARIZARD_MEGA_Y');
    expect(() => builder.setTeamMemberMega(teamId, memberIds[1]!, 'SPECIES_VENUSAUR_MEGA')).toThrow(
      expect.objectContaining({ code: 'SECOND_MEGA' }),
    );
    expect(builder.getTeam(teamId).members[1]!.mega).toBeNull();
  });

  it('lets the Mega Team Member switch to its other Mega', () => {
    const { builder, teamId, memberIds } = teamOf('SPECIES_CHARIZARD', 'SPECIES_VENUSAUR');
    builder.setTeamMemberMega(teamId, memberIds[0]!, 'SPECIES_CHARIZARD_MEGA_X');
    builder.setTeamMemberMega(teamId, memberIds[0]!, 'SPECIES_CHARIZARD_MEGA_Y');
    expect(builder.getTeam(teamId).members[0]!.mega?.displayName).toBe('Charizard Y');
  });

  it('allows a Mega on another Team Member once the first is turned off', () => {
    const { builder, teamId, memberIds } = teamOf('SPECIES_CHARIZARD', 'SPECIES_VENUSAUR');
    builder.setTeamMemberMega(teamId, memberIds[0]!, 'SPECIES_CHARIZARD_MEGA_X');
    builder.setTeamMemberMega(teamId, memberIds[0]!, null);
    builder.setTeamMemberMega(teamId, memberIds[1]!, 'SPECIES_VENUSAUR_MEGA');
    expect(builder.getTeam(teamId).members[1]!.mega?.id).toBe('SPECIES_VENUSAUR_MEGA');
  });

  it("rejects a Mega that isn't one of the Species' Megas", () => {
    const { builder, teamId, memberIds } = teamOf('SPECIES_CHARIZARD', 'SPECIES_ZACIAN_HERO');
    expect(() => builder.setTeamMemberMega(teamId, memberIds[0]!, 'SPECIES_VENUSAUR_MEGA')).toThrow(
      expect.objectContaining({ code: 'INVALID_MEGA' }),
    );
    // Crowned Zacian is an item form, not a Mega.
    expect(builder.getMegaOptions('SPECIES_ZACIAN_HERO')).toEqual([]);
    expect(() => builder.setTeamMemberMega(teamId, memberIds[1]!, 'SPECIES_ZACIAN_CROWNED')).toThrow(
      expect.objectContaining({ code: 'INVALID_MEGA' }),
    );
  });

  it('keeps the Mega when the Team is duplicated', () => {
    const { builder, teamId, memberIds } = teamOf('SPECIES_CHARIZARD');
    builder.setTeamMemberMega(teamId, memberIds[0]!, 'SPECIES_CHARIZARD_MEGA_X');
    const copyId = builder.duplicateTeam(teamId);
    expect(builder.getTeam(copyId).members[0]!.mega?.id).toBe('SPECIES_CHARIZARD_MEGA_X');
  });
});

describe("Mega stats, ability and Innates", () => {
  it("Stat Roles use the Mega's base stats", () => {
    // Charizard: 84 Atk / 109 SpA reads special; Charizard X: 130 / 130 reads mixed.
    const { builder, teamId, memberIds } = teamOf('SPECIES_CHARIZARD');
    const roles = () => builder.getCritique(teamId).statRoles.members.find((m) => m.memberId === memberIds[0])?.roles;
    expect(roles()).toContain('specialAttacker');
    builder.setTeamMemberMega(teamId, memberIds[0]!, 'SPECIES_CHARIZARD_MEGA_X');
    expect(builder.getTeam(teamId).members[0]!.stats).toEqual({ hp: 78, atk: 130, def: 111, spa: 130, spd: 85, spe: 100 });
    expect(roles()).toContain('mixedAttacker');
    expect(roles()).not.toContain('specialAttacker');
  });

  it("the Mega's ability and Innates replace the chosen Ability and the Species' Innates", () => {
    const { builder, teamId, memberIds } = teamOf('SPECIES_CHARIZARD');
    builder.setTeamMemberAbility(teamId, memberIds[0]!, 'ABILITY_SOLAR_POWER');
    builder.setTeamMemberMega(teamId, memberIds[0]!, 'SPECIES_CHARIZARD_MEGA_X');
    const member = builder.getTeam(teamId).members[0]!;
    expect(member.mega?.ability.id).toBe('ABILITY_TOUGH_CLAWS');
    expect(member.effectiveAbilityIds).toEqual(['ABILITY_FLAME_BODY', 'ABILITY_ROCK_HEAD', 'ABILITY_RECKLESS', 'ABILITY_TOUGH_CLAWS']);
    expect(member.ability?.id).toBe('ABILITY_SOLAR_POWER'); // kept for when Mega is turned off
  });

  it("a Mega's Innate changes Defensive Coverage: Mega Gyarados levitates", () => {
    // Base Gyarados (Water/Flying) is already Ground-immune; Gyarados Mega (Water/Dark) keeps it via Levitate.
    const { builder, teamId, memberIds } = teamOf('SPECIES_GYARADOS');
    builder.setTeamMemberMega(teamId, memberIds[0]!, 'SPECIES_GYARADOS_MEGA');
    const ground = builder.getCritique(teamId).defensiveCoverage.byType.find((t) => t.attackType === 'TYPE_GROUND')!;
    expect(ground.immune).toContain(memberIds[0]);
  });
});

describe('Saved Megas', () => {
  it('a reload keeps the Mega, and older saves with `mega: false` load with Mega off', () => {
    const storage = new InMemoryStorage();
    const builder = createTeamBuilder({ storage });
    const teamId = builder.getActiveTeamId();
    builder.addTeamMember(teamId, 'SPECIES_CHARIZARD');
    builder.addTeamMember(teamId, 'SPECIES_VENUSAUR');
    const [zard] = builder.getTeam(teamId).members.map((m) => m.id);
    builder.setTeamMemberMega(teamId, zard!, 'SPECIES_CHARIZARD_MEGA_Y');
    expect(createTeamBuilder({ storage }).getTeam(teamId).members[0]!.mega?.id).toBe('SPECIES_CHARIZARD_MEGA_Y');

    const saved = JSON.parse(storage.load(STORAGE_KEY)!);
    for (const m of saved.teams[0].members) m.mega = false;
    storage.save(STORAGE_KEY, JSON.stringify(saved));
    const reloaded = createTeamBuilder({ storage }).getTeam(teamId);
    expect(reloaded.members.map((m) => m.member.mega)).toEqual([null, null]);
  });
});
