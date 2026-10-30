import { describe, expect, it } from 'vitest';
import { createTeamBuilder, InMemoryStorage, STORAGE_KEY } from '../index';

function newBuilder(storage = new InMemoryStorage()) {
  return createTeamBuilder({ storage });
}

describe('Saved Teams', () => {
  it('creates a named Team and makes it the active Team', () => {
    const builder = newBuilder();
    const teamId = builder.createTeam('vs Clair');

    expect(builder.getTeams().map((t) => t.name)).toEqual(['Team 1', 'vs Clair']);
    expect(builder.getActiveTeamId()).toBe(teamId);
    expect(builder.getTeam(teamId).members).toEqual([]);
  });

  it('names a Team created without a name after the next free number', () => {
    const builder = newBuilder();
    builder.createTeam('  ');
    builder.createTeam('');
    expect(builder.getTeams().map((t) => t.name)).toEqual(['Team 1', 'Team 2', 'Team 3']);
  });

  it('renames a Team, trimming the name', () => {
    const builder = newBuilder();
    const teamId = builder.getActiveTeamId();
    builder.renameTeam(teamId, '  Elite Four ');
    expect(builder.getTeam(teamId).name).toBe('Elite Four');
  });

  it('rejects a blank Team name and keeps the old one', () => {
    const builder = newBuilder();
    const teamId = builder.getActiveTeamId();
    expect(() => builder.renameTeam(teamId, '   ')).toThrow(
      expect.objectContaining({ code: 'INVALID_TEAM_NAME' }),
    );
    expect(builder.getTeam(teamId).name).toBe('Team 1');
  });

  it('duplicates a Team as an independent copy placed after it and made active', () => {
    const builder = newBuilder();
    const original = builder.getActiveTeamId();
    builder.renameTeam(original, 'vs Clair');
    builder.addTeamMember(original, 'SPECIES_MARILL');
    builder.addTeamMember(original, 'SPECIES_PIDGEY');
    builder.createTeam('Elite Four');

    const copy = builder.duplicateTeam(original);
    expect(builder.getActiveTeamId()).toBe(copy);
    expect(builder.getTeams().map((t) => t.name)).toEqual(['vs Clair', 'vs Clair (copy)', 'Elite Four']);

    const originalMembers = builder.getTeam(original).members;
    const copyMembers = builder.getTeam(copy).members;
    expect(copyMembers.map((m) => m.species.id)).toEqual(['SPECIES_MARILL', 'SPECIES_PIDGEY']);
    const originalIds = originalMembers.map((m) => m.id);
    expect(copyMembers.every((m) => !originalIds.includes(m.id))).toBe(true);

    builder.removeTeamMember(copy, copyMembers[0]!.id);
    builder.addTeamMember(copy, 'SPECIES_RATTATA');
    builder.renameTeam(copy, 'vs Clair, plan B');
    expect(builder.getTeam(original).name).toBe('vs Clair');
    expect(builder.getTeam(original).members.map((m) => m.species.id)).toEqual([
      'SPECIES_MARILL',
      'SPECIES_PIDGEY',
    ]);
  });

  it('selects which Team is active', () => {
    const builder = newBuilder();
    const first = builder.getActiveTeamId();
    builder.createTeam('Second');
    builder.selectTeam(first);
    expect(builder.getActiveTeamId()).toBe(first);
    expect(() => builder.selectTeam('no-such-team')).toThrow(
      expect.objectContaining({ code: 'UNKNOWN_TEAM' }),
    );
  });

  it('deletes a Team, moving the active Team to its neighbour', () => {
    const builder = newBuilder();
    const first = builder.getActiveTeamId();
    const second = builder.createTeam('Second');
    const third = builder.createTeam('Third');
    builder.selectTeam(second);

    builder.deleteTeam(second);
    expect(builder.getTeams().map((t) => t.id)).toEqual([first, third]);
    expect(builder.getActiveTeamId()).toBe(third);

    builder.deleteTeam(third);
    expect(builder.getActiveTeamId()).toBe(first);
  });

  it('keeps the active Team when deleting another one', () => {
    const builder = newBuilder();
    const first = builder.getActiveTeamId();
    const second = builder.createTeam('Second');
    builder.selectTeam(first);
    builder.deleteTeam(second);
    expect(builder.getActiveTeamId()).toBe(first);
  });

  it('always keeps one Team: deleting the last Team replaces it with an empty one', () => {
    const builder = newBuilder();
    const only = builder.getActiveTeamId();
    builder.renameTeam(only, 'Doomed');
    builder.addTeamMember(only, 'SPECIES_MARILL');

    builder.deleteTeam(only);
    const teams = builder.getTeams();
    expect(teams).toHaveLength(1);
    expect(teams[0]?.id).not.toBe(only);
    expect(teams[0]?.name).toBe('Team 1');
    expect(builder.getTeam(builder.getActiveTeamId()).members).toEqual([]);
  });
});

describe('Difficulty', () => {
  it('defaults to Normal and can be set to Hard', () => {
    const builder = newBuilder();
    expect(builder.getDifficulty()).toBe('NORMAL');
    builder.setDifficulty('HARD');
    expect(builder.getDifficulty()).toBe('HARD');
  });
});

describe('Saving', () => {
  it('restores Teams, the active Team and Difficulty after a reload from the same storage', () => {
    const storage = new InMemoryStorage();
    const first = newBuilder(storage);
    first.renameTeam(first.getActiveTeamId(), 'vs Clair');
    first.addTeamMember(first.getActiveTeamId(), 'SPECIES_MARILL');
    const copy = first.duplicateTeam(first.getActiveTeamId());
    first.renameTeam(copy, 'Elite Four');
    first.createTeam('Scratch');
    first.selectTeam(copy);
    first.setDifficulty('HARD');

    const reloaded = newBuilder(storage);
    expect(reloaded.getTeams().map((t) => t.name)).toEqual(['vs Clair', 'Elite Four', 'Scratch']);
    expect(reloaded.getActiveTeamId()).toBe(copy);
    expect(reloaded.getTeam(copy).members.map((m) => m.species.id)).toEqual(['SPECIES_MARILL']);
    expect(reloaded.getDifficulty()).toBe('HARD');
  });

  it('records the data version the saved data was built on', () => {
    const storage = new InMemoryStorage();
    const first = newBuilder(storage);
    expect(first.getSavedDataVersion()).toBeNull(); // nothing saved yet
    first.createTeam('Elite Four');

    const reloaded = newBuilder(storage);
    expect(reloaded.getSavedDataVersion()).toEqual(reloaded.getDataVersion());
    expect(reloaded.getSavedDataVersion()?.hackVersion).toBe('v1.2.1');
  });

  it('loads a save from before Difficulty and data version existed, filling in defaults', () => {
    const storage = new InMemoryStorage();
    const legacy = {
      schemaVersion: 1,
      teams: [
        { id: 'a', name: 'Old Team', members: [{ id: 'm1', speciesId: 'SPECIES_MARILL' }] },
        { id: 'b', name: 'Other', members: [] },
      ],
      activeTeamId: 'missing',
    };
    storage.save(STORAGE_KEY, JSON.stringify(legacy));

    const builder = newBuilder(storage);
    expect(builder.getTeams().map((t) => t.name)).toEqual(['Old Team', 'Other']);
    expect(builder.getActiveTeamId()).toBe('a');
    expect(builder.getDifficulty()).toBe('NORMAL');
    expect(builder.getSavedDataVersion()).toBeNull();
    const [marill] = builder.getTeam('a').members;
    expect(marill?.member).toMatchObject({ moves: [], abilityId: null, mega: null });
    expect(marill?.species.id).toBe('SPECIES_MARILL');
  });

  it('starts fresh when the saved data is unreadable', () => {
    const storage = new InMemoryStorage();
    storage.save(STORAGE_KEY, '{not json');
    const builder = newBuilder(storage);
    expect(builder.getTeams().map((t) => t.name)).toEqual(['Team 1']);
    expect(builder.getDifficulty()).toBe('NORMAL');
  });
});
