// Learnable moves of a Species, each with every way it can be learned (level-up, TM/HM, tutor, egg).
import type { Move, MoveId, SpeciesId } from './model';
import type { DataSnapshot } from './snapshot';

/**
 * One way to learn a move. Level-up keeps the numeric level so a Box Entry's level can be compared
 * against it (ticket 09 flags level-up moves above the Box Entry's level).
 */
export type MoveSource =
  | { kind: 'levelUp'; level: number }
  | { kind: 'machine'; label: string } // "TM04", "HM03"
  | { kind: 'tutor' }
  | { kind: 'egg' };

export interface LearnableMove {
  move: Move;
  /** Every distinct source, in order: level-up (by level), TM/HM, tutor, egg. */
  sources: MoveSource[];
}

/** Every move a Species can learn, in first-source order. Empty for an unknown Species. */
export function learnableMoves(data: DataSnapshot, speciesId: SpeciesId): LearnableMove[] {
  const learnset = data.getLearnset(speciesId);
  if (!learnset) return [];
  const byMove = new Map<MoveId, LearnableMove>();
  const add = (moveId: MoveId, source: MoveSource) => {
    let entry = byMove.get(moveId);
    if (!entry) {
      const move = data.getMove(moveId);
      if (!move) return; // not in moves.json: nothing to show
      entry = { move, sources: [] };
      byMove.set(moveId, entry);
    }
    if (!entry.sources.some((s) => sameSource(s, source))) entry.sources.push(source);
  };
  for (const { level, move } of [...learnset.levelUp].sort((a, b) => a.level - b.level)) {
    add(move, { kind: 'levelUp', level });
  }
  for (const move of learnset.tmhm) {
    const label = data.getMachineLabel(move);
    if (label) add(move, { kind: 'machine', label });
  }
  for (const move of learnset.tutors) add(move, { kind: 'tutor' });
  for (const move of learnset.eggMoves) add(move, { kind: 'egg' });
  return [...byMove.values()];
}

export function isLearnable(data: DataSnapshot, speciesId: SpeciesId, moveId: MoveId): boolean {
  return learnableMoves(data, speciesId).some((m) => m.move.id === moveId);
}

function sameSource(a: MoveSource, b: MoveSource): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'levelUp' && b.kind === 'levelUp') return a.level === b.level;
  if (a.kind === 'machine' && b.kind === 'machine') return a.label === b.label;
  return true;
}
