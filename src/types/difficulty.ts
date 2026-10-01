// Difficulty is the story-point-inspired input users choose instead of
// typing raw XP. XP values are derived, never hand-entered.
export type Difficulty =
  | "VeryEasy"
  | "Easy"
  | "Medium"
  | "Hard"
  | "Epic"
  | "Legendary";

export interface DifficultyMeta {
  label: string;
  icon: string;
  xp: number;
  colorClass: string;
}

export const DIFFICULTY_META: Record<Difficulty, DifficultyMeta> = {
  VeryEasy: { label: "Very Easy", icon: "⚪", xp: 50, colorClass: "bg-difficulty-veryeasy text-black" },
  Easy: { label: "Easy", icon: "🟢", xp: 100, colorClass: "bg-difficulty-easy text-black" },
  Medium: { label: "Medium", icon: "🔵", xp: 250, colorClass: "bg-difficulty-medium text-black" },
  Hard: { label: "Hard", icon: "🟣", xp: 500, colorClass: "bg-difficulty-hard text-white" },
  Epic: { label: "Epic", icon: "🟡", xp: 1000, colorClass: "bg-difficulty-epic text-black" },
  Legendary: { label: "Legendary", icon: "🔴", xp: 2000, colorClass: "bg-difficulty-legendary text-white" },
};

export function xpForDifficulty(difficulty: Difficulty): number {
  return DIFFICULTY_META[difficulty].xp;
}
