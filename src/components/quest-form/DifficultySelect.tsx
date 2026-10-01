import type { Difficulty } from "../../types";
import { DIFFICULTY_META } from "../../types/difficulty";
import { useTranslation } from "../../i18n";

interface DifficultySelectProps {
  value: Difficulty;
  onChange: (value: Difficulty) => void;
}

const ORDER: Difficulty[] = ["VeryEasy", "Easy", "Medium", "Hard", "Epic", "Legendary"];
const LABEL_KEYS: Record<
  Difficulty,
  | "difficultyVeryEasy"
  | "difficultyEasy"
  | "difficultyMedium"
  | "difficultyHard"
  | "difficultyEpic"
  | "difficultyLegendary"
> = {
  VeryEasy: "difficultyVeryEasy",
  Easy: "difficultyEasy",
  Medium: "difficultyMedium",
  Hard: "difficultyHard",
  Epic: "difficultyEpic",
  Legendary: "difficultyLegendary",
};

/** Difficulty combobox. XP is derived from this choice and is never editable directly. */
export function DifficultySelect({ value, onChange }: DifficultySelectProps): JSX.Element {
  const t = useTranslation();
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Difficulty)}
      className="w-full rounded-lg border border-hud-border bg-hud-bg px-3 py-1.5 text-sm text-white outline-none focus:border-sky-400/60"
    >
      {ORDER.map((difficulty) => {
        const meta = DIFFICULTY_META[difficulty];
        return (
          <option key={difficulty} value={difficulty} className="bg-[#17171d]">
            {meta.icon} {t(LABEL_KEYS[difficulty])} ({meta.xp} XP)
          </option>
        );
      })}
    </select>
  );
}
