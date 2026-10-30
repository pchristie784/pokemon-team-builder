import type { TeamMemberView } from '../domain';
import { useTeamBuilder } from './useTeamBuilder';

/** Chooses a Team Member's Ability from its Species' regular and hidden abilities. */
export function AbilityPicker({ member }: { member: TeamMemberView }) {
  const builder = useTeamBuilder();
  const teamId = builder.getTeams().find((t) => t.members.some((m) => m.id === member.id))?.id;
  if (!teamId) return null;
  const options = builder.getAbilityOptions(teamId, member.id);
  const label = `Ability for ${member.species.displayName}`;

  return (
    <select
      className="ability-picker"
      aria-label={label}
      title={member.ability?.description ?? 'No Ability chosen'}
      value={member.member.abilityId ?? ''}
      onChange={(e) => builder.setTeamMemberAbility(teamId, member.id, e.target.value || null)}
    >
      <option value="">— none —</option>
      {options.map(({ ability, hidden }) => (
        <option key={ability.id} value={ability.id} title={ability.description}>
          {ability.name}
          {hidden ? ' (hidden)' : ''}
        </option>
      ))}
    </select>
  );
}
