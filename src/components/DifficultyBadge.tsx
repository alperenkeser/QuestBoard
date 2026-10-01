import type { Difficulty } from "../types";
import { DIFFICULTY_META } from "../types/difficulty";

interface DifficultyBadgeProps {
  difficulty: Difficulty;
  /** "icon" shows just the emoji (compact HUD card); "full" also shows the label + XP. */
  variant?: "icon" | "full";
}

export function DifficultyBadge({ difficulty, variant = "icon" }: DifficultyBadgeProps): JSX.Element {
  const meta = DIFFICULTY_META[difficulty];

  if (variant === "icon") {
    return (
      <span
        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${meta.colorClass}`}
        title={`${meta.label} — ${meta.xp} XP`}
      >
        {meta.icon}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${meta.colorClass}`}
    >
      {meta.icon} {meta.label} · {meta.xp} XP
    </span>
  );
}
