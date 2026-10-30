import { describe, expect, it } from 'vitest';
import { createTeamBuilder, hasDataIssues, InMemoryStorage, STORAGE_KEY } from '../index';

function newBuilder(storage = new InMemoryStorage()) {
  return createTeamBuilder({ storage });
}

/** A builder with a Box, two Teams (moves, Ability, Mega), Box Mode and Hard Difficulty. */
function populatedBuilder(storage = new InMemoryStorage()) {
  const builder = newBuilder(storage);
  const charizardEntry = builder.addBoxEntry('SPECIES_CHARIZARD', 40);
  builder.addBoxEntry('SPECIES_PIKACHU', null);
  const teamId = builder.getActiveTeamId();
  builder.renameTeam(teamId, 'vs Clair');
  builder.addTeamMember(teamId, 'SPECIES_CHARIZARD', charizardEntry);
  const memberId = builder.getTeam(teamId).members[0]!.id;
  builder.setTeamMemberMoves(teamId, memberId, ['MOVE_EARTHQUAKE']);
  builder.setTeamMemberAbility(teamId, memberId, 'ABILITY_SOLAR_POWER');
  builder.setTeamMemberMega(teamId, memberId, 'SPECIES_CHARIZARD_MEGA_X');
  const second = builder.createTeam('vs Red');
  builder.addTeamMember(second, 'SPECIES_PIKACHU');
  builder.setDifficulty('HARD');
  builder.setMode('BOX');
  return builder;
}

/** An exported file edited by hand, e.g. to simulate an export made with older data. */
function editExport(json: string, edit: (file: any) => void): string {
  const file = JSON.parse(json);
  edit(file);
  return JSON.stringify(file);
}

describe('Export and import', () => {
  it('round-trips all data: Box, Teams with moves, Ability and Mega, mode and Difficulty', () => {
    const sourceStorage = new InMemoryStorage();
    const json = populatedBuilder(sourceStorage).exportData();

    const target = newBuilder();
    target.importData(json);

    // Compared with the source's saved data as reloaded (loading fills optional fields like boxEntryId).
    expect(target.getState()).toEqual(newBuilder(sourceStorage).getState());
    expect(target.getTeam(target.getTeams()[0]!.id).members[0]).toMatchObject({
      moves: [expect.objectContaining({ id: 'MOVE_EARTHQUAKE' })],
      ability: expect.objectContaining({ id: 'ABILITY_SOLAR_POWER' }),
      mega: expect.objectContaining({ id: 'SPECIES_CHARIZARD_MEGA_X' }),
    });
    expect(target.getTeams().map((t) => t.name)).toEqual(['vs Clair', 'vs Red']);
    expect(target.getBox()).toHaveLength(2);
    expect(target.getMode()).toBe('BOX');
    expect(target.getDifficulty()).toBe('HARD');
  });

  it('previews an import without changing the current data', () => {
    const json = populatedBuilder().exportData();
    const target = newBuilder();
    const before = target.getState();

    const preview = target.previewImport(json);

    expect(preview).toMatchObject({ ok: true, teamNames: ['vs Clair', 'vs Red'], teamMemberCount: 2, boxEntryCount: 2 });
    expect(preview.ok && hasDataIssues(preview.issues)).toBe(false);
    expect(target.getState()).toBe(before);
  });

  it.each([
    ['not JSON', 'not json {'],
    ['JSON that is not an export', JSON.stringify({ hello: 'world' })],
    ['an export with no Teams', JSON.stringify({ format: 'soulgold-team-builder-export', exportVersion: 1, state: { schemaVersion: 1, teams: [] } })],
  ])('rejects %s, leaving the current data unchanged', (_, json) => {
    const target = populatedBuilder();
    const before = target.getState();

    expect(target.previewImport(json)).toEqual({ ok: false, error: expect.any(String) });
    expect(() => target.importData(json)).toThrow(expect.objectContaining({ code: 'INVALID_IMPORT' }));
    expect(target.getState()).toBe(before);
  });

  it('rejects an export made by a newer version of the app', () => {
    const json = editExport(populatedBuilder().exportData(), (file) => (file.state.schemaVersion = 2));
    expect(newBuilder().previewImport(json)).toEqual({ ok: false, error: expect.stringMatching(/newer version/) });
  });

  it('flags an import with an unknown Species constant, naming the affected Team and Box Entry', () => {
    const source = populatedBuilder();
    const pikachuEntry = source.getBox()[1]!.id;
    const json = editExport(source.exportData(), (file) => {
      file.state.teams[1].members[0].speciesId = 'SPECIES_MISSINGNO';
      file.state.box[1].speciesId = 'SPECIES_MISSINGNO';
    });

    const preview = newBuilder().previewImport(json);

    if (!preview.ok) throw new Error(preview.error);
    expect(preview.issues.affectedTeams).toEqual(['vs Red']);
    expect(preview.issues.affectedBoxEntries).toEqual([pikachuEntry]);
    expect(preview.issues.unknownReferences).toEqual([
      { kind: 'SPECIES', id: 'SPECIES_MISSINGNO', location: expect.objectContaining({ kind: 'TEAM_MEMBER', teamName: 'vs Red' }) },
      { kind: 'SPECIES', id: 'SPECIES_MISSINGNO', location: { kind: 'BOX_ENTRY', boxEntryId: pikachuEntry, speciesId: 'SPECIES_MISSINGNO' } },
    ]);
  });

  it('keeps unknown references after import, so they stay flagged rather than silently dropped', () => {
    const json = editExport(populatedBuilder().exportData(), (file) => {
      file.state.teams[0].members[0].moves.push('MOVE_REMOVED_IN_UPDATE');
      file.state.teams[1].members[0].speciesId = 'SPECIES_MISSINGNO';
    });
    const target = newBuilder();
    target.importData(json);

    const issues = target.getDataIssues();
    expect(issues.unknownReferences.map((r) => [r.kind, r.id])).toEqual([
      ['MOVE', 'MOVE_REMOVED_IN_UPDATE'],
      ['SPECIES', 'SPECIES_MISSINGNO'],
    ]);
    expect(issues.affectedTeams).toEqual(['vs Clair', 'vs Red']);
    // The Team Member with the unknown Species is still on its Team (the Team view leaves it out).
    expect(target.getTeams()[1]!.members).toHaveLength(1);
  });

  it('flags unknown moves, Abilities and Megas with the affected Team Member', () => {
    const source = populatedBuilder();
    const team = source.getTeams()[0]!;
    const json = editExport(source.exportData(), (file) => {
      const member = file.state.teams[0].members[0];
      member.moves = ['MOVE_EARTHQUAKE', 'MOVE_REMOVED_IN_UPDATE'];
      member.abilityId = 'ABILITY_REMOVED_IN_UPDATE';
      member.mega = 'SPECIES_CHARIZARD_MEGA_Z';
    });

    const preview = newBuilder().previewImport(json);

    if (!preview.ok) throw new Error(preview.error);
    const location = { kind: 'TEAM_MEMBER', teamId: team.id, teamName: 'vs Clair', teamMemberId: team.members[0]!.id, speciesId: 'SPECIES_CHARIZARD' };
    expect(preview.issues.unknownReferences).toEqual([
      { kind: 'MOVE', id: 'MOVE_REMOVED_IN_UPDATE', location },
      { kind: 'ABILITY', id: 'ABILITY_REMOVED_IN_UPDATE', location },
      { kind: 'MEGA', id: 'SPECIES_CHARIZARD_MEGA_Z', location },
    ]);
  });

  it('reports a data version mismatch between the export and the current data snapshot', () => {
    const target = newBuilder();
    const json = editExport(populatedBuilder().exportData(), (file) => {
      file.state.dataVersion = { hackVersion: '0.0.1', fetchedAt: '2020-01-01T00:00:00.000Z' };
    });

    const preview = target.previewImport(json);

    if (!preview.ok) throw new Error(preview.error);
    expect(preview.issues.dataVersionMismatch).toEqual({
      saved: { hackVersion: '0.0.1', fetchedAt: '2020-01-01T00:00:00.000Z' },
      current: target.getDataVersion(),
    });
    expect(hasDataIssues(preview.issues)).toBe(true);
  });
});

describe('Data Issues in saved data', () => {
  it('flags saved data with an unknown Species and an older data version', () => {
    const storage = new InMemoryStorage();
    const source = populatedBuilder(storage);
    const saved = JSON.parse(storage.load(STORAGE_KEY)!);
    saved.box[0].speciesId = 'SPECIES_MISSINGNO';
    saved.dataVersion = { hackVersion: '0.0.1', fetchedAt: '2020-01-01T00:00:00.000Z' };
    storage.save(STORAGE_KEY, JSON.stringify(saved));

    const issues = newBuilder(storage).getDataIssues();

    expect(issues.affectedBoxEntries).toEqual([source.getBox()[0]!.id]);
    expect(issues.dataVersionMismatch?.saved.hackVersion).toBe('0.0.1');
  });

  it('has no Data Issues for fresh data', () => {
    expect(hasDataIssues(newBuilder().getDataIssues())).toBe(false);
  });
});
