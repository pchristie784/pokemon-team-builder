import type { TeamMemberView } from '../domain';
import { useTeamBuilder } from './useTeamBuilder';

/**
 * Toggles Mega on a Team Member whose Species has one; a select when there are several (Charizard X/Y).
 * Disabled while another Team Member has a Mega (at most one per Team).
 */
export function MegaToggle({ member }: { member: TeamMemberView }) {
  const builder = useTeamBuilder();
  const teamId = builder.getTeams().find((t) => t.members.some((m) => m.id === member.id))?.id;
  const options = builder.getMegaOptions(member.species.id);
  if (!teamId || options.length === 0) return null;

  const otherMega = builder.getTeam(teamId).members.find((m) => m.id !== member.id && m.mega);
  const blocked = otherMega !== undefined && member.mega === null;
  const title = blocked
    ? `Only one Mega per Team: ${otherMega.species.displayName} already has Mega on`
    : member.mega
      ? `${member.mega.displayName}: ${member.mega.ability.name} replaces the chosen Ability`
      : 'Mega off';
  const set = (megaId: string | null) => builder.setTeamMemberMega(teamId, member.id, megaId);
  const label = `Mega for ${member.species.displayName}`;

  return (
    <div className="mega-toggle" title={title}>
      {options.length === 1 ? (
        <label>
          <input
            type="checkbox"
            aria-label={label}
            checked={member.mega !== null}
            disabled={blocked}
            onChange={(e) => set(e.target.checked ? options[0]!.id : null)}
          />{' '}
          {options[0]!.displayName} ({options[0]!.itemName})
        </label>
      ) : (
        <select aria-label={label} value={member.mega?.id ?? ''} disabled={blocked} onChange={(e) => set(e.target.value || null)}>
          <option value="">Off</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.displayName} ({o.itemName})
            </option>
          ))}
        </select>
      )}
      {member.mega && <span className="mega-ability">Ability: {member.mega.ability.name}</span>}
      {blocked && <span className="mega-blocked">One Mega per Team</span>}
    </div>
  );
}
