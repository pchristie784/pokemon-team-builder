import { describe, expect, it } from 'vitest';
import { createTeamBuilder, DomainError, InMemoryStorage } from '../index';

function newBuilder() {
  return createTeamBuilder({ storage: new InMemoryStorage() });
}

describe('Species search', () => {
  it('finds a Species by name, case-insensitively', () => {
    const results = newBuilder().searchSpecies('cyndaquil');
    expect(results.map((s) => s.id)).toContain('SPECIES_CYNDAQUIL');
    expect(results[0]?.displayName).toBe('Cyndaquil');
  });

  it('returns Alolan Vulpix as its own Species, distinguishable from Vulpix', () => {
    const results = newBuilder().searchSpecies('vulpix');
    const vulpix = results.find((s) => s.id === 'SPECIES_VULPIX');
    const alolan = results.find((s) => s.id === 'SPECIES_VULPIX_ALOLA');
    expect(vulpix).toMatchObject({ displayName: 'Vulpix', types: ['TYPE_FIRE'] });
    expect(alolan).toMatchObject({ displayName: 'Vulpix (Alolan)', types: ['TYPE_ICE'] });
  });

  it('matches regional forms by their region', () => {
    const results = newBuilder().searchSpecies('alolan vulpix');
    expect(results.map((s) => s.id)).toEqual(['SPECIES_VULPIX_ALOLA']);
  });

  it('does not return Megas as Species', () => {
    const builder = newBuilder();
    expect(builder.searchSpecies('venusaur').map((s) => s.id)).toEqual(['SPECIES_VENUSAUR']);
    expect(builder.searchSpecies('mega').map((s) => s.id)).toEqual(['SPECIES_MEGANIUM', 'SPECIES_YANMEGA']);
    expect(builder.getSpecies('SPECIES_VENUSAUR_MEGA')).toBeUndefined();
  });

  it('returns nothing for a blank query', () => {
    expect(newBuilder().searchSpecies('   ')).toEqual([]);
  });
});

describe('Team (Dex Mode)', () => {
  it('starts with one empty Team', () => {
    const builder = newBuilder();
    expect(builder.getTeams()).toHaveLength(1);
    expect(builder.getTeam(builder.getActiveTeamId()).members).toEqual([]);
  });

  it('adds a Team Member showing its typing and named Innates', () => {
    const builder = newBuilder();
    const teamId = builder.getActiveTeamId();
    builder.addTeamMember(teamId, 'SPECIES_MARILL');

    const [marill] = builder.getTeam(teamId).members;
    expect(marill?.species.displayName).toBe('Marill');
    expect(marill?.types).toEqual(['TYPE_WATER', 'TYPE_FAIRY']);
    expect(marill?.innates.map((a) => a.name)).toEqual(['Cheek Pouch', 'Water Veil']);
  });

  it('rejects a seventh Team Member and leaves the Team unchanged', () => {
    const builder = newBuilder();
    const teamId = builder.getActiveTeamId();
    for (let i = 0; i < 6; i++) builder.addTeamMember(teamId, 'SPECIES_PIDGEY');
    expect(builder.getTeam(teamId).isFull).toBe(true);

    expect(() => builder.addTeamMember(teamId, 'SPECIES_RATTATA')).toThrow(
      expect.objectContaining({ code: 'TEAM_FULL' }),
    );
    expect(() => builder.addTeamMember(teamId, 'SPECIES_RATTATA')).toThrow(DomainError);
    expect(builder.getTeam(teamId).members).toHaveLength(6);
  });

  it('allows duplicate Species as separate Team Members', () => {
    const builder = newBuilder();
    const teamId = builder.getActiveTeamId();
    builder.addTeamMember(teamId, 'SPECIES_PIDGEY');
    builder.addTeamMember(teamId, 'SPECIES_PIDGEY');
    const [a, b] = builder.getTeam(teamId).members;
    expect(a?.id).not.toBe(b?.id);
  });

  it('removes a Team Member', () => {
    const builder = newBuilder();
    const teamId = builder.getActiveTeamId();
    builder.addTeamMember(teamId, 'SPECIES_PIDGEY');
    builder.addTeamMember(teamId, 'SPECIES_VULPIX_ALOLA');
    const pidgey = builder.getTeam(teamId).members[0]!;

    builder.removeTeamMember(teamId, pidgey.id);
    expect(builder.getTeam(teamId).members.map((m) => m.species.id)).toEqual(['SPECIES_VULPIX_ALOLA']);
  });

  it('reorders Team Members, keeping each one intact', () => {
    const builder = newBuilder();
    const teamId = builder.getActiveTeamId();
    for (const id of ['SPECIES_PIDGEY', 'SPECIES_MARILL', 'SPECIES_ONIX']) builder.addTeamMember(teamId, id);
    const onix = builder.getTeam(teamId).members[2]!;
    const order = () => builder.getTeam(teamId).members.map((m) => m.species.displayName);

    builder.moveTeamMember(teamId, onix.id, 0);
    expect(order()).toEqual(['Onix', 'Pidgey', 'Marill']);
    expect(builder.getTeam(teamId).members[0]!.id).toBe(onix.id);
    builder.moveTeamMember(teamId, onix.id, 1);
    expect(order()).toEqual(['Pidgey', 'Onix', 'Marill']);
  });

  it('rejects moving a Team Member outside the Team, or an unknown Team Member', () => {
    const builder = newBuilder();
    const teamId = builder.getActiveTeamId();
    builder.addTeamMember(teamId, 'SPECIES_PIDGEY');
    builder.addTeamMember(teamId, 'SPECIES_MARILL');
    const pidgey = builder.getTeam(teamId).members[0]!;
    for (const index of [-1, 2, 0.5]) {
      expect(() => builder.moveTeamMember(teamId, pidgey.id, index)).toThrow(
        expect.objectContaining({ code: 'INVALID_POSITION' }),
      );
    }
    expect(() => builder.moveTeamMember(teamId, 'nobody', 0)).toThrow(
      expect.objectContaining({ code: 'UNKNOWN_TEAM_MEMBER' }),
    );
  });

  it('rejects a Mega or unknown constant as a Team Member', () => {
    const builder = newBuilder();
    const teamId = builder.getActiveTeamId();
    for (const id of ['SPECIES_VENUSAUR_MEGA', 'SPECIES_MISSINGNO']) {
      expect(() => builder.addTeamMember(teamId, id)).toThrow(
        expect.objectContaining({ code: 'UNKNOWN_SPECIES' }),
      );
    }
  });

  it('notifies subscribers when the Team changes', () => {
    const builder = newBuilder();
    let notified = 0;
    const unsubscribe = builder.subscribe(() => notified++);
    builder.addTeamMember(builder.getActiveTeamId(), 'SPECIES_PIDGEY');
    unsubscribe();
    builder.addTeamMember(builder.getActiveTeamId(), 'SPECIES_PIDGEY');
    expect(notified).toBe(1);
  });

  it('restores the Team from the same storage', () => {
    const storage = new InMemoryStorage();
    const first = createTeamBuilder({ storage });
    first.addTeamMember(first.getActiveTeamId(), 'SPECIES_MARILL');

    const second = createTeamBuilder({ storage });
    expect(second.getTeam(second.getActiveTeamId()).members.map((m) => m.species.id)).toEqual([
      'SPECIES_MARILL',
    ]);
  });
});

describe('Data version', () => {
  it('reports the Soulgold hack version of the snapshot', () => {
    expect(newBuilder().getDataVersion().hackVersion).toBe('v1.2.1');
  });
});
