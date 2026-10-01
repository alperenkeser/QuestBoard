import type { Priority } from "../../types";
import { useTranslation } from "../../i18n";

interface PrioritySelectProps {
  value: Priority;
  onChange: (value: Priority) => void;
}

const ORDER: Priority[] = ["Low", "Medium", "High", "Critical"];
const LABEL_KEYS: Record<
  Priority,
  "priorityLow" | "priorityMedium" | "priorityHigh" | "priorityCritical"
> = {
  Low: "priorityLow",
  Medium: "priorityMedium",
  High: "priorityHigh",
  Critical: "priorityCritical",
};

export function PrioritySelect({ value, onChange }: PrioritySelectProps): JSX.Element {
  const t = useTranslation();
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Priority)}
      className="w-full rounded-lg border border-hud-border bg-hud-bg px-3 py-1.5 text-sm text-white outline-none focus:border-sky-400/60"
    >
      {ORDER.map((priority) => (
        <option key={priority} value={priority} className="bg-[#17171d]">
          {t(LABEL_KEYS[priority])}
        </option>
      ))}
    </select>
  );
}
