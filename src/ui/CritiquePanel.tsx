import type { TeamId } from '../domain';
import { DefensiveCoverage } from './DefensiveCoverage';
import { OffensiveCoverage } from './OffensiveCoverage';
import { StatRoles } from './StatRoles';
import { useTeamBuilder } from './useTeamBuilder';

/** The Critique of one Team; re-derived on every AppState change. Later tickets add sections here. */
export function CritiquePanel({ teamId }: { teamId: TeamId }) {
  const builder = useTeamBuilder();
  const team = builder.getTeam(teamId);
  const critique = builder.getCritique(teamId);
  return (
    <section className="critique-panel">
      <h2>Critique</h2>
      {team.members.length === 0 ? (
        <p className="muted">Add Team Members to see the Critique.</p>
      ) : (
        <>
          <DefensiveCoverage coverage={critique.defensiveCoverage} members={team.members} />
          <OffensiveCoverage coverage={critique.offensiveCoverage} members={team.members} />
          <StatRoles section={critique.statRoles} />
        </>
      )}
    </section>
  );
}
