import type { Mode } from '../domain';
import { useTeamBuilder } from './useTeamBuilder';

const MODE_LABELS: Record<Mode, { label: string; hint: string }> = {
  BOX: { label: 'Box Mode', hint: 'Team Members come only from your Box and their Planned Evolutions' },
  DEX: { label: 'Dex Mode', hint: 'Any Species can be a Team Member' },
};

/** Switches between Box Mode and Dex Mode. Existing Team Members are never removed. */
export function ModeToggle() {
  const builder = useTeamBuilder();
  const mode = builder.getMode();
  return (
    <div className="mode-toggle" role="radiogroup" aria-label="Mode">
      {(['BOX', 'DEX'] as const).map((m) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={mode === m}
          className={mode === m ? 'active' : undefined}
          title={MODE_LABELS[m].hint}
          onClick={() => builder.setMode(m)}
        >
          {MODE_LABELS[m].label}
        </button>
      ))}
    </div>
  );
}
