import { DIFFICULTIES, type Difficulty } from '../domain';
import { useTeamBuilder } from './useTeamBuilder';

const DIFFICULTY_LABELS: Record<Difficulty, string> = { NORMAL: 'Normal', HARD: 'Hard' };

/** Playthrough settings: the Difficulty (decides which Boss parties apply). */
export function SettingsBar() {
  const builder = useTeamBuilder();
  return (
    <div className="settings-bar">
      <label>
        Difficulty{' '}
        <select
          value={builder.getDifficulty()}
          onChange={(e) => builder.setDifficulty(e.target.value as Difficulty)}
        >
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {DIFFICULTY_LABELS[d]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
