import { describe, expect, it } from 'vitest';
import { createTeamBuilder, InMemoryStorage, STORAGE_KEY } from '../index';

function newBuilder(storage = new InMemoryStorage()) {
  return createTeamBuilder({ storage });
}

describe('Box', () => {
  it('adds Box Entries with an optional level; duplicates of a Species are separate entries', () => {
    const builder = newBuilder();
    const first = builder.addBoxEntry('SPECIES_MARILL', 12);
    const second = builder.addBoxEntry('SPECIES_MARILL');

    expect(first).not.toBe(second);
    expect(builder.getBox().map((e) => [e.species.displayName, e.level])).toEqual([
      ['Marill', 12],
      ['Marill', null],
    ]);
  });

  it("edits a Box Entry's level and Species, e.g. after it evolves", () => {
    const builder = newBuilder();
    const id = builder.addBoxEntry('SPECIES_CYNDAQUIL', 10);
    builder.setBoxEntryLevel(id, 14);
    builder.setBoxEntrySpecies(id, 'SPECIES_QUILAVA');
    expect(builder.getBox().map((e) => [e.species.displayName, e.level])).toEqual([['Quilava', 14]]);
    builder.setBoxEntryLevel(id, null);
    expect(builder.getBox()[0]!.level).toBeNull();
  });

  it('rejects a level outside 1 to 100 and an unknown Species', () => {
    const builder = newBuilder();
    expect(() => builder.addBoxEntry('SPECIES_MARILL', 0)).toThrow(expect.objectContaining({ code: 'INVALID_LEVEL' }));
    expect(() => builder.addBoxEntry('SPECIES_MARILL', 101)).toThrow(expect.objectContaining({ code: 'INVALID_LEVEL' }));
    expect(() => builder.addBoxEntry('SPECIES_MISSINGNO')).toThrow(expect.objectContaining({ code: 'UNKNOWN_SPECIES' }));
    expect(builder.getBox()).toEqual([]);
  });

  it('removes one Box Entry, leaving its duplicate', () => {
    const builder = newBuilder();
    const first = builder.addBoxEntry('SPECIES_MARILL', 12);
    builder.addBoxEntry('SPECIES_MARILL', 20);
    builder.removeBoxEntry(first);
    expect(builder.getBox().map((e) => e.level)).toEqual([20]);
  });

  it('saves the Box with other state', () => {
    const storage = new InMemoryStorage();
    newBuilder(storage).addBoxEntry('SPECIES_EEVEE', 5);
    expect(newBuilder(storage).getBox().map((e) => [e.species.id, e.level])).toEqual([['SPECIES_EEVEE', 5]]);
  });
});

describe('Planned Evolutions', () => {
  const options = (builder: ReturnType<typeof newBuilder>, speciesId: string) =>
    builder.getPlannedEvolutions(speciesId).map((e) => [e.species.displayName, e.label]);

  it('offers every later evolution of a Cyndaquil, Typhlosion included, with its method', () => {
    const builder = newBuilder();
    expect(options(builder, 'SPECIES_CYNDAQUIL')).toEqual([
      ['Quilava', 'Lv 14'],
      ['Typhlosion', 'via Quilava (Lv 14), then Lv 36'],
      ['Typhlosion (Hisuian)', 'via Quilava (Lv 14), then Dusk Stone'],
    ]);
  });

  it("offers all of Eevee's branches, one option per Species even when two methods reach it", () => {
    const builder = newBuilder();
    expect(options(builder, 'SPECIES_EEVEE')).toEqual([
      ['Jolteon', 'Thunder Stone'],
      ['Vaporeon', 'Water Stone'],
      ['Flareon', 'Fire Stone'],
      ['Sylveon', 'High Friendship, Knows Fairy-type Move'],
      ['Espeon', 'High Friendship, Day'],
      ['Umbreon', 'High Friendship, Night'],
      ['Leafeon', 'In Ilex Forest or Leaf Stone'],
      ['Glaceon', 'In Ice Path B4F or Ice Stone'],
    ]);
  });

  it('labels conditional and unusual methods briefly', () => {
    const builder = newBuilder();
    expect(options(builder, 'SPECIES_KIRLIA')).toEqual([
      ['Gardevoir', 'Lv 30'],
      ['Gallade', 'Dawn Stone, Male'],
    ]);
    expect(options(builder, 'SPECIES_NINCADA')).toEqual([
      ['Ninjask', 'Lv 20'],
      ['Shedinja', 'Lv 20 with a free party slot, 1 Poke Ball in Bag'],
    ]);
    expect(options(builder, 'SPECIES_TANDEMAUS').map(([, label]) => label)).toEqual([
      'Lv 25 in battle, Random 99%',
      'Lv 25 in battle, Random 1%',
    ]);
  });

  it('offers nothing for a Species that does not evolve', () => {
    expect(newBuilder().getPlannedEvolutions('SPECIES_TYPHLOSION')).toEqual([]);
  });

  it("lists each Box Entry's Planned Evolutions in the Box", () => {
    const builder = newBuilder();
    builder.addBoxEntry('SPECIES_RALTS');
    expect(builder.getBox()[0]!.plannedEvolutions.map((e) => e.species.displayName)).toEqual([
      'Kirlia',
      'Gardevoir',
      'Gallade',
    ]);
  });
});

describe('Box Mode and Dex Mode', () => {
  it('starts in Dex Mode and saves the chosen mode', () => {
    const storage = new InMemoryStorage();
    const builder = newBuilder(storage);
    expect(builder.getMode()).toBe('DEX');
    builder.setMode('BOX');
    expect(newBuilder(storage).getMode()).toBe('BOX');
  });

  it('in Dex Mode any Species can become a Team Member, legendaries included', () => {
    const builder = newBuilder();
    const teamId = builder.getActiveTeamId();
    builder.addTeamMember(teamId, 'SPECIES_MEWTWO');
    expect(builder.getTeam(teamId).members[0]!.boxEntry).toBeNull();
  });

  it('in Box Mode a Species not in the Box is rejected', () => {
    const builder = newBuilder();
    const teamId = builder.getActiveTeamId();
    builder.addBoxEntry('SPECIES_CYNDAQUIL', 10);
    builder.setMode('BOX');
    expect(() => builder.addTeamMember(teamId, 'SPECIES_MEWTWO')).toThrow(
      expect.objectContaining({ code: 'NOT_IN_BOX' }),
    );
    expect(builder.getTeam(teamId).members).toEqual([]);
  });

  it('in Box Mode a Box Entry or one of its Planned Evolutions can become a Team Member; the latter is marked Planned', () => {
    const builder = newBuilder();
    const teamId = builder.getActiveTeamId();
    const entryId = builder.addBoxEntry('SPECIES_CYNDAQUIL', 10);
    builder.setMode('BOX');
    builder.addTeamMember(teamId, 'SPECIES_CYNDAQUIL');
    builder.addTeamMember(teamId, 'SPECIES_TYPHLOSION');

    const [cyndaquil, typhlosion] = builder.getTeam(teamId).members;
    expect(cyndaquil!.boxEntry?.id).toBe(entryId);
    expect(cyndaquil!.plannedEvolution).toBeNull();
    expect(typhlosion!.boxEntry?.id).toBe(entryId);
    expect(typhlosion!.plannedEvolution?.label).toBe('via Quilava (Lv 14), then Lv 36');
  });

  it('a Team Member can be chosen from a specific Box Entry when the Box holds duplicates', () => {
    const builder = newBuilder();
    const teamId = builder.getActiveTeamId();
    builder.addBoxEntry('SPECIES_MARILL', 12);
    const second = builder.addBoxEntry('SPECIES_MARILL', 30);
    builder.setMode('BOX');
    builder.addTeamMember(teamId, 'SPECIES_AZUMARILL', second);
    expect(builder.getTeam(teamId).members[0]!.boxEntry?.level).toBe(30);
    expect(() => builder.addTeamMember(teamId, 'SPECIES_TYPHLOSION', second)).toThrow(
      expect.objectContaining({ code: 'NOT_IN_BOX' }),
    );
  });

  it('switching mode keeps existing Team Members; Box Mode restrictions apply only when adding', () => {
    const builder = newBuilder();
    const teamId = builder.getActiveTeamId();
    builder.addTeamMember(teamId, 'SPECIES_MEWTWO');
    builder.setMode('BOX');
    expect(builder.getTeam(teamId).members.map((m) => m.species.id)).toEqual(['SPECIES_MEWTWO']);
  });

  it('offers the Box Mode candidate pool: Box Entries and their Planned Evolutions', () => {
    const builder = newBuilder();
    const entryId = builder.addBoxEntry('SPECIES_RALTS', 8);
    expect(builder.getBoxCandidates().map((c) => [c.species.displayName, c.boxEntryId, c.plannedEvolution?.label ?? null])).toEqual([
      ['Ralts', entryId, null],
      ['Kirlia', entryId, 'Lv 20'],
      ['Gardevoir', entryId, 'via Kirlia (Lv 20), then Lv 30'],
      ['Gallade', entryId, 'via Kirlia (Lv 20), then Dawn Stone, Male'],
    ]);
  });
});

describe('Team Members chosen from a Box Entry', () => {
  function boxTeam() {
    const builder = newBuilder();
    const teamId = builder.getActiveTeamId();
    const entryId = builder.addBoxEntry('SPECIES_CYNDAQUIL', 10);
    builder.setMode('BOX');
    builder.addTeamMember(teamId, 'SPECIES_CYNDAQUIL');
    builder.addTeamMember(teamId, 'SPECIES_TYPHLOSION');
    return { builder, teamId, entryId };
  }

  it('stay on the Team, unlinked from the Box, when their Box Entry is removed', () => {
    const { builder, teamId, entryId } = boxTeam();
    builder.removeBoxEntry(entryId);
    const members = builder.getTeam(teamId).members;
    expect(members.map((m) => [m.species.displayName, m.boxEntry, m.plannedEvolution])).toEqual([
      ['Cyndaquil', null, null],
      ['Typhlosion', null, null],
    ]);
  });

  it("follow their Box Entry's evolution: still-later evolutions stay Planned, others are unlinked", () => {
    const { builder, teamId, entryId } = boxTeam();
    builder.setBoxEntrySpecies(entryId, 'SPECIES_QUILAVA');
    const [cyndaquil, typhlosion] = builder.getTeam(teamId).members;
    expect(cyndaquil!.boxEntry).toBeNull();
    expect(typhlosion!.boxEntry?.id).toBe(entryId);
    expect(typhlosion!.plannedEvolution?.label).toBe('Lv 36');

    builder.setBoxEntrySpecies(entryId, 'SPECIES_TYPHLOSION');
    expect(builder.getTeam(teamId).members[1]!.plannedEvolution).toBeNull();
    // Changing it back does not relink the Cyndaquil Team Member.
    builder.setBoxEntrySpecies(entryId, 'SPECIES_CYNDAQUIL');
    expect(builder.getTeam(teamId).members[0]!.boxEntry).toBeNull();
  });
});

describe('Level-up moves above the Box Entry level', () => {
  function flagged(builder: ReturnType<typeof newBuilder>, teamId: string, memberIndex: number) {
    const member = builder.getTeam(teamId).members[memberIndex]!;
    const moves = builder.getTeamMemberLearnableMoves(teamId, member.id);
    const flag = (id: string) => moves.find((m) => m.move.id === id)?.aboveBoxEntryLevel;
    return { flag, count: moves.length, all: builder.getLearnableMoves(member.species.id).length };
  }

  it('are flagged, not hidden, for a Team Member chosen from a Box Entry with a level', () => {
    const builder = newBuilder();
    const teamId = builder.getActiveTeamId();
    builder.addBoxEntry('SPECIES_CYNDAQUIL', 10);
    builder.setMode('BOX');
    builder.addTeamMember(teamId, 'SPECIES_CYNDAQUIL');
    builder.addTeamMember(teamId, 'SPECIES_TYPHLOSION');

    const cyndaquil = flagged(builder, teamId, 0);
    expect(cyndaquil.count).toBe(cyndaquil.all);
    expect(cyndaquil.flag('MOVE_EMBER')).toBe(false); // Lv 7
    expect(cyndaquil.flag('MOVE_FLAME_WHEEL')).toBe(true); // Lv 19
    expect(cyndaquil.flag('MOVE_BODY_SLAM')).toBe(false); // tutor only

    // A Planned Evolution compares its own learnset with the Box Entry's current level.
    const typhlosion = flagged(builder, teamId, 1);
    expect(typhlosion.flag('MOVE_FLAMETHROWER')).toBe(true); // Lv 48
    expect(typhlosion.flag('MOVE_EMBER')).toBe(false); // Lv 1
  });

  it('are not flagged without a Box Entry level, or in Dex Mode', () => {
    const builder = newBuilder();
    const teamId = builder.getActiveTeamId();
    builder.addTeamMember(teamId, 'SPECIES_CYNDAQUIL');
    builder.addBoxEntry('SPECIES_CYNDAQUIL');
    builder.setMode('BOX');
    builder.addTeamMember(teamId, 'SPECIES_CYNDAQUIL');
    expect(flagged(builder, teamId, 0).flag('MOVE_ERUPTION')).toBe(false);
    expect(flagged(builder, teamId, 1).flag('MOVE_ERUPTION')).toBe(false);
  });
});

describe('Saving the Box and mode', () => {
  it('loads a save from before the Box existed with an empty Box in Dex Mode', () => {
    const storage = new InMemoryStorage();
    storage.save(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        activeTeamId: 't1',
        teams: [{ id: 't1', name: 'Old', members: [{ id: 'm1', speciesId: 'SPECIES_MARILL', moves: [] }] }],
      }),
    );
    const builder = newBuilder(storage);
    expect(builder.getBox()).toEqual([]);
    expect(builder.getMode()).toBe('DEX');
    expect(builder.getTeam('t1').members[0]!.boxEntry).toBeNull();
  });

  it('keeps Planned Evolution Team Members linked to their Box Entry after reloading', () => {
    const storage = new InMemoryStorage();
    const builder = newBuilder(storage);
    const teamId = builder.getActiveTeamId();
    builder.addBoxEntry('SPECIES_EEVEE', 5);
    builder.setMode('BOX');
    builder.addTeamMember(teamId, 'SPECIES_UMBREON');
    expect(newBuilder(storage).getTeam(teamId).members[0]!.plannedEvolution?.label).toBe('High Friendship, Night');
  });
});
