import { MAX_TEAM_MEMBERS, type TeamId } from '../domain';
import { BoxMemberPicker } from './BoxMemberPicker';
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
      {builder.getMode() === 'BOX' ? (
        <BoxMemberPicker teamId={teamId} disabled={team.isFull} />
      ) : (
        <SpeciesSearch
          disabled={team.isFull}
          disabledReason={`A Team has at most ${MAX_TEAM_MEMBERS} Team Members`}
          onPick={(speciesId) => builder.addTeamMember(teamId, speciesId)}
        />
      )}
      <ol className="team-members">
        {team.members.map((member, index) => (
          <li key={member.id}>
            <TeamMemberCard
              member={member}
              onRemove={() => builder.removeTeamMember(teamId, member.id)}
              onMoveUp={index > 0 ? () => builder.moveTeamMember(teamId, member.id, index - 1) : undefined}
              onMoveDown={
                index < team.members.length - 1 ? () => builder.moveTeamMember(teamId, member.id, index + 1) : undefined
              }
            />
          </li>
        ))}
      </ol>
    </section>
  );
}
