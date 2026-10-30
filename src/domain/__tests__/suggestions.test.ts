import { describe, expect, it } from 'vitest';
import { createTeamBuilder, InMemoryStorage, MAX_SUGGESTIONS, type SpeciesId } from '../index';

function teamOf(...speciesIds: SpeciesId[]) {
  const builder = createTeamBuilder({ storage: new InMemoryStorage() });
  const teamId = builder.getActiveTeamId();
  for (const id of speciesIds) builder.addTeamMember(teamId, id);
  return { builder, teamId };
}

describe('Suggestions', () => {
  it('a Team with an Unanswered Type gets a top Suggestion that resists it, listed as its reason', () => {
    // Golem (Rock/Ground) and Rhydon (Ground/Rock): Water and Grass hit both 4×, nobody resists them.
    const { builder, teamId } = teamOf('SPECIES_GOLEM', 'SPECIES_RHYDON');
    expect(builder.getCritique(teamId).problems).toContainEqual({ kind: 'unansweredType', type: 'TYPE_WATER' });

    const top = builder.suggest(teamId)[0]!;
    expect(top.action).toEqual({ kind: 'fill' });
    expect(top.fixes).toContainEqual({ kind: 'unansweredType', type: 'TYPE_WATER' });
    expect(top.reason).toContain('Water Unanswered Type');

    builder.applySuggestion(teamId, top);
    const water = builder.getCritique(teamId).defensiveCoverage.byType.find((t) => t.attackType === 'TYPE_WATER')!;
    const added = builder.getTeam(teamId).members[2]!;
    expect(added.species.id).toBe(top.species.id);
    expect([...water.resist, ...water.immune]).toContain(added.id);
  });

  it('in Box Mode, Suggestions come only from Box Entries and their Planned Evolutions', () => {
    const builder = createTeamBuilder({ storage: new InMemoryStorage() });
    const teamId = builder.getActiveTeamId();
    const golem = builder.addBoxEntry('SPECIES_GOLEM');
    const rhydon = builder.addBoxEntry('SPECIES_RHYDON');
    const squirtle = builder.addBoxEntry('SPECIES_SQUIRTLE', 10);
    const caterpie = builder.addBoxEntry('SPECIES_CATERPIE');
    builder.setMode('BOX');
    builder.addTeamMember(teamId, 'SPECIES_GOLEM', golem);
    builder.addTeamMember(teamId, 'SPECIES_RHYDON', rhydon);

    const suggestions = builder.suggest(teamId);
    const offered = suggestions.map((s) => [s.species.id, s.boxEntryId, s.plannedEvolution !== null]);
    // Squirtle's line resists Water; Caterpie's line does nothing for this Team. Golem and Rhydon are taken.
    expect(offered).toEqual(
      expect.arrayContaining([
        ['SPECIES_SQUIRTLE', squirtle, false],
        ['SPECIES_BLASTOISE', squirtle, true],
      ]),
    );
    for (const s of suggestions) {
      expect(['SPECIES_SQUIRTLE', 'SPECIES_WARTORTLE', 'SPECIES_BLASTOISE', 'SPECIES_METAPOD', 'SPECIES_BUTTERFREE', 'SPECIES_CATERPIE']).toContain(s.species.id);
      expect([squirtle, caterpie]).toContain(s.boxEntryId);
    }

    const blastoise = suggestions.find((s) => s.species.id === 'SPECIES_BLASTOISE')!;
    builder.applySuggestion(teamId, blastoise);
    const added = builder.getTeam(teamId).members[2]!;
    expect([added.species.id, added.boxEntry?.id, added.plannedEvolution?.species.id]).toEqual(['SPECIES_BLASTOISE', squirtle, 'SPECIES_BLASTOISE']);
  });

  describe('a full Team', () => {
    // Rock, Ground and Fighting types: Water, Grass, Ice and Fighting are Stacked Weaknesses, all physical, no Fast member.
    const FULL = ['SPECIES_GOLEM', 'SPECIES_RHYDON', 'SPECIES_STEELIX', 'SPECIES_MACHAMP', 'SPECIES_DONPHAN', 'SPECIES_URSARING'];

    it('gets Suggestions that replace a named Team Member, each Species once', () => {
      const { builder, teamId } = teamOf(...FULL);
      const members = builder.getTeam(teamId).members;
      const suggestions = builder.suggest(teamId);

      expect(suggestions.length).toBeGreaterThan(0);
      for (const s of suggestions) {
        expect(s.action.kind).toBe('replace');
        const { action } = s;
        if (action.kind !== 'replace') continue;
        const replaced = members.find((m) => m.id === action.memberId);
        expect(replaced?.species.id).toBe(action.species.id);
        expect(FULL).not.toContain(s.species.id);
      }
      const species = suggestions.map((s) => s.species.id);
      expect(new Set(species).size).toBe(species.length);
    });

    it('applying a replace Suggestion swaps that Team Member in place', () => {
      const { builder, teamId } = teamOf(...FULL);
      const before = builder.getTeam(teamId).members;
      const top = builder.suggest(teamId)[0]!;
      const { action } = top;
      if (action.kind !== 'replace') throw new Error('expected a replace Suggestion');
      const index = before.findIndex((m) => m.id === action.memberId);

      builder.applySuggestion(teamId, top);
      const after = builder.getTeam(teamId).members;
      expect(after.map((m) => m.species.id)).toEqual(before.map((m, i) => (i === index ? top.species.id : m.species.id)));
      const problems = builder.getCritique(teamId).problems;
      for (const fixed of top.fixes) expect(problems).not.toContainEqual(fixed);
    });
  });

  describe('ranking', () => {
    // Arcanine and Golem: Water and Fighting are Unanswered Types, and there is no Fast member.
    function rankedFromBox(...boxSpecies: SpeciesId[]) {
      const { builder, teamId } = teamOf('SPECIES_ARCANINE', 'SPECIES_GOLEM');
      for (const id of boxSpecies) builder.addBoxEntry(id);
      builder.setMode('BOX');
      return builder.suggest(teamId);
    }

    it('ranks a candidate that adds a new Stacked Weakness below one that fixes fewer problems without', () => {
      const suggestions = rankedFromBox('SPECIES_CHARIZARD', 'SPECIES_POLIWRATH');
      const names = suggestions.map((s) => s.species.displayName);
      // Charizard answers Fighting and is Fast, but is a third member weak to Water.
      const charizard = suggestions.find((s) => s.species.id === 'SPECIES_CHARIZARD')!;
      expect(charizard.fixes).toHaveLength(2);
      expect(charizard.introduces).toContainEqual({ kind: 'stackedWeakness', type: 'TYPE_WATER' });
      expect(charizard.reason).toContain('adds: Water Stacked Weakness');
      // Poliwrath only answers Water.
      expect(suggestions.find((s) => s.species.id === 'SPECIES_POLIWRATH')!.fixes).toEqual([
        { kind: 'unansweredType', type: 'TYPE_WATER' },
      ]);
      expect(names).toEqual(['Poliwrath', 'Charizard']);
    });

    it('ranks by problems fixed, then fewest new problems introduced', () => {
      // Crobat and Slowbro each fix two problems; Crobat leaves a Psychic Unanswered Type, Slowbro Ghost and Dark.
      const names = rankedFromBox('SPECIES_POLIWRATH', 'SPECIES_SLOWBRO', 'SPECIES_CROBAT').map((s) => s.species.displayName);
      expect(names).toEqual(['Crobat', 'Slowbro', 'Poliwrath']);
    });

    it('leaves out candidates that fix nothing', () => {
      // Golem is already on the Team; Graveler (Rock/Ground) fixes none of its problems.
      expect(rankedFromBox('SPECIES_GRAVELER')).toEqual([]);
    });
  });

  it('suggests for a full Team in Dex Mode quickly', () => {
    const { builder, teamId } = teamOf('SPECIES_GOLEM', 'SPECIES_RHYDON', 'SPECIES_STEELIX', 'SPECIES_MACHAMP', 'SPECIES_DONPHAN', 'SPECIES_URSARING');
    builder.suggest(teamId); // warm up
    const start = performance.now();
    const suggestions = builder.suggest(teamId);
    const elapsed = performance.now() - start;
    expect(suggestions).toHaveLength(MAX_SUGGESTIONS);
    // ~80 ms locally. Shared CI runners are several times slower and noisier, so CI gets more room.
    expect(elapsed).toBeLessThan(process.env.CI ? 2000 : 500);
  });
});
