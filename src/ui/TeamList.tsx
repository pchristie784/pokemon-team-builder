import { useEffect, useState } from 'react';
import { isDomainError } from '../domain';
import { useTeamBuilder } from './useTeamBuilder';

/** The saved Teams: pick the active one, create, rename, duplicate and delete. */
export function TeamList() {
  const builder = useTeamBuilder();
  const teams = builder.getTeams();
  const activeId = builder.getActiveTeamId();
  const active = teams.find((t) => t.id === activeId);
  const [draftName, setDraftName] = useState(active?.name ?? '');
  useEffect(() => setDraftName(active?.name ?? ''), [activeId, active?.name]);

  function commitRename() {
    if (!active || draftName === active.name) return;
    try {
      builder.renameTeam(activeId, draftName);
    } catch (error) {
      if (!isDomainError(error, 'INVALID_TEAM_NAME')) throw error;
      setDraftName(active.name);
    }
  }

  function deleteActive() {
    if (!active) return;
    const last = teams.length === 1 ? ' It will be replaced with an empty Team.' : '';
    if (window.confirm(`Delete "${active.name}"?${last}`)) builder.deleteTeam(activeId);
  }

  return (
    <nav className="team-list" aria-label="Saved Teams">
      <ul>
        {teams.map((team) => (
          <li key={team.id}>
            <button
              type="button"
              className={team.id === activeId ? 'team-tab active' : 'team-tab'}
              aria-current={team.id === activeId ? 'true' : undefined}
              onClick={() => builder.selectTeam(team.id)}
            >
              {team.name} <span className="muted">({team.members.length})</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="team-list-actions">
        <label>
          Name{' '}
          <input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') setDraftName(active?.name ?? '');
            }}
          />
        </label>
        <button type="button" onClick={() => builder.createTeam('')}>
          New Team
        </button>
        <button type="button" onClick={() => builder.duplicateTeam(activeId)}>
          Duplicate
        </button>
        <button type="button" onClick={deleteActive}>
          Delete
        </button>
      </div>
    </nav>
  );
}
