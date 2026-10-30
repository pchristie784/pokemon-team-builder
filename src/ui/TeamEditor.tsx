import { MAX_TEAM_MEMBERS, type TeamId } from '../domain';
import { SpeciesSearch } from './SpeciesSearch';
import { TeamMemberCard } from './TeamMemberCard';
import { useTeamBuilder } from './useTeamBuilder';

export function TeamEditor({ teamId }: { teamId: TeamId }) {
  const builder = useTeamBuilder();
  const team = builder.getTeam(teamId);
  return (
    <section className="team-editor">
      <h2>
        {team.name}{' '}
        <span className="muted">
          ({team.members.length}/{MAX_TEAM_MEMBERS})
        </span>
      </h2>
      <SpeciesSearch
        disabled={team.isFull}
        disabledReason={`A Team has at most ${MAX_TEAM_MEMBERS} Team Members`}
        onPick={(speciesId) => builder.addTeamMember(teamId, speciesId)}
      />
      <ol className="team-members">
        {team.members.map((member) => (
          <li key={member.id}>
            <TeamMemberCard member={member} onRemove={() => builder.removeTeamMember(teamId, member.id)} />
          </li>
        ))}
      </ol>
    </section>
  );
}
