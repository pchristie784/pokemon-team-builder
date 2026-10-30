import { describe, expect, it } from 'vitest';
import { createTeamBuilder, InMemoryStorage, type SpeciesId } from '../index';

function teamOf(...speciesIds: SpeciesId[]) {
  const builder = createTeamBuilder({ storage: new InMemoryStorage() });
  const teamId = builder.getActiveTeamId();
  for (const id of speciesIds) builder.addTeamMember(teamId, id);
  return { builder, teamId };
}

/** Stat Roles the Critique gives the Team Member at `index`, matched by member id. */
function memberRoles(builder: ReturnType<typeof teamOf>['builder'], teamId: string, index: number) {
  const member = builder.getTeam(teamId).members[index];
  return builder.getCritique(teamId).statRoles.members.find((m) => m.memberId === member?.id)?.roles;
}

function critiqueOf(...speciesIds: SpeciesId[]) {
  const { builder, teamId } = teamOf(...speciesIds);
  return builder.getCritique(teamId);
}

describe('Stat Roles', () => {
  it('flags a Team of only physical attackers as all physical', () => {
    // Machamp (130 Atk / 65 SpA), Golem (120 / 55)
    const critique = critiqueOf('SPECIES_MACHAMP', 'SPECIES_GOLEM');
    expect(critique.problems).toContainEqual({ kind: 'allPhysical' });
    expect(critique.statRoles.flags).toContainEqual({ kind: 'allPhysical' });
  });

  it('clears all physical and no Fast member when a Fast special attacker joins', () => {
    const { builder, teamId } = teamOf('SPECIES_MACHAMP', 'SPECIES_GOLEM');
    expect(builder.getCritique(teamId).problems).toContainEqual({ kind: 'noFastMember' });
    builder.addTeamMember(teamId, 'SPECIES_ALAKAZAM'); // 50 Atk / 135 SpA, 120 Spe
    const problems = builder.getCritique(teamId).problems;
    expect(problems).not.toContainEqual({ kind: 'allPhysical' });
    expect(problems).not.toContainEqual({ kind: 'noFastMember' });
  });

  it('flags a Team of only special attackers as all special', () => {
    // Gengar (65 / 130), Alakazam (50 / 135)
    const problems = critiqueOf('SPECIES_GENGAR', 'SPECIES_ALAKAZAM').problems;
    expect(problems).toContainEqual({ kind: 'allSpecial' });
    expect(problems).not.toContainEqual({ kind: 'allPhysical' });
  });

  it('does not flag all physical when a mixed attacker is on the Team', () => {
    // Lucario (110 Atk / 115 SpA) is mixed
    const problems = critiqueOf('SPECIES_MACHAMP', 'SPECIES_LUCARIO').problems;
    expect(problems).not.toContainEqual({ kind: 'allPhysical' });
    expect(problems).not.toContainEqual({ kind: 'allSpecial' });
  });

  it('labels each Team Member with its attacker role, Fast and Tank', () => {
    const { builder, teamId } = teamOf('SPECIES_ALAKAZAM', 'SPECIES_SNORLAX', 'SPECIES_INFERNAPE', 'SPECIES_PIKACHU');
    const rolesOf = (index: number) => memberRoles(builder, teamId, index);
    expect(rolesOf(0)).toEqual(['specialAttacker', 'fast']); // 135 SpA, 120 Spe
    expect(rolesOf(1)).toEqual(['physicalAttacker', 'tank']); // 110 Atk / 65 SpA, 335 bulk
    expect(rolesOf(2)).toEqual(['mixedAttacker', 'fast']); // 104 / 104, 108 Spe
    expect(rolesOf(3)).toEqual(['mixedAttacker']); // 55 / 50, 90 Spe, frail
  });

  it('counts base Speed of exactly 100 as Fast', () => {
    // Charizard: 100 Spe
    const { builder, teamId } = teamOf('SPECIES_CHARIZARD', 'SPECIES_SNORLAX');
    expect(memberRoles(builder, teamId, 0)).toContain('fast');
    expect(builder.getCritique(teamId).problems).not.toContainEqual({ kind: 'noFastMember' });
  });

  it('raises no balance flags for a Team of one member, but still labels its roles', () => {
    const critique = critiqueOf('SPECIES_MACHAMP');
    expect(critique.statRoles.flags).toEqual([]);
    expect(critique.statRoles.members[0]?.roles).toEqual(['physicalAttacker']);
  });

  it('raises no balance flags for an empty Team', () => {
    expect(critiqueOf().statRoles).toEqual({ members: [], flags: [] });
  });

  it('shows Stat Roles on each Team Member of the Team view', () => {
    const { builder, teamId } = teamOf('SPECIES_ALAKAZAM');
    expect(builder.getTeam(teamId).members[0]?.statRoles).toEqual(['specialAttacker', 'fast']);
  });
});
