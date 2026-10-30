import type { TeamMemberView } from '../domain';
import { TypeBadges } from './TypeBadges';

interface Props {
  member: TeamMemberView;
  onRemove: () => void;
}

// Later tickets add pickers (Ability, moves, Mega) as their own components rendered here.
export function TeamMemberCard({ member, onRemove }: Props) {
  return (
    <article className="team-member-card">
      <header>
        <h3>{member.species.displayName}</h3>
        <button type="button" className="remove" onClick={onRemove} aria-label={`Remove ${member.species.displayName}`}>
          Remove
        </button>
      </header>
      <TypeBadges types={member.types} />
      <dl>
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
      </dl>
    </article>
  );
}
