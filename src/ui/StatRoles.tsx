import type { StatRole, StatRoleProblem, StatRoles as StatRolesSection } from '../domain';

const ROLE_LABELS: Record<StatRole, string> = {
  physicalAttacker: 'Physical attacker',
  specialAttacker: 'Special attacker',
  mixedAttacker: 'Mixed attacker',
  fast: 'Fast',
  tank: 'Tank',
};

const FLAG_LABELS: Record<StatRoleProblem['kind'], string> = {
  allPhysical: 'All physical attackers',
  allSpecial: 'All special attackers',
  noFastMember: 'No Fast member',
};

/** A Team Member's Stat Roles, shown on its card. */
export function StatRoleBadges({ roles }: { roles: StatRole[] }) {
  return (
    <ul className="stat-roles">
      {roles.map((role) => (
        <li key={role} className={`stat-role stat-role-${role}`}>
          {ROLE_LABELS[role]}
        </li>
      ))}
    </ul>
  );
}

/** The Stat Roles section of the Critique panel: balance flags. */
export function StatRoles({ section }: { section: StatRolesSection }) {
  return (
    <div className="stat-roles-critique">
      <h3>Stat Roles</h3>
      <ul className="critique-flags">
        {section.flags.map((p) => (
          <li key={p.kind} className="flag flag-warn">
            {FLAG_LABELS[p.kind]}
          </li>
        ))}
        {section.flags.length === 0 && (
          <li className="muted">No all-physical, all-special or no-Fast-member flags.</li>
        )}
      </ul>
    </div>
  );
}
