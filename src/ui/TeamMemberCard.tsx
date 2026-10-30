import type { TeamMemberView } from '../domain';
import { AbilityPicker } from './AbilityPicker';
import { MegaToggle } from './MegaToggle';
import { useTeamBuilder } from './useTeamBuilder';
import { MovePicker } from './MovePicker';
import { StatRoleBadges } from './StatRoles';
import { TypeBadges } from './TypeBadges';

interface Props {
  member: TeamMemberView;
  onRemove: () => void;
}

// Later tickets add pickers (Ability, moves, Mega) as their own components rendered here.
export function TeamMemberCard({ member, onRemove }: Props) {
  const builder = useTeamBuilder();
  return (
    <article className="team-member-card">
      <header>
        <h3>
          {member.species.displayName}
          {member.plannedEvolution && (
            <span className="planned-marker" title={`Planned Evolution: ${member.plannedEvolution.label}`}>
              Planned
            </span>
          )}
        </h3>
        <button type="button" className="remove" onClick={onRemove} aria-label={`Remove ${member.species.displayName}`}>
          Remove
        </button>
      </header>
      <TypeBadges types={member.types} />
      <StatRoleBadges roles={member.statRoles} />
      <dl>
        <dt>Ability</dt>
        <dd>
          <AbilityPicker member={member} />
        </dd>
        {builder.getMegaOptions(member.species.id).length > 0 && (
          <>
            <dt>Mega</dt>
            <dd>
              <MegaToggle member={member} />
            </dd>
          </>
        )}
        <dt>Innates</dt>
        <dd>
          <ul className="innates">
            {member.innates.map((innate) => (
              <li key={innate.id} title={innate.description}>
                {innate.name}
              </li>
            ))}
          </ul>
        </dd>
        <dt>Moves</dt>
        <dd>
          <MovePicker member={member} />
        </dd>
      </dl>
    </article>
  );
}
