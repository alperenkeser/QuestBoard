import { useTranslation } from "../i18n";

export type SortKey = "priority" | "dateCreated" | "dueDate" | "xpReward";

interface SortControlProps {
  sortKey: SortKey;
  onChange: (key: SortKey) => void;
}

export function SortControl({ sortKey, onChange }: SortControlProps): JSX.Element {
  const t = useTranslation();
  const options: { value: SortKey; label: string }[] = [
    { value: "priority", label: t("priority") },
    { value: "dateCreated", label: t("dateCreated") },
    { value: "dueDate", label: t("dueDate") },
    { value: "xpReward", label: t("xpReward") },
  ];
  return (
    <select
      value={sortKey}
      onChange={(e) => onChange(e.target.value as SortKey)}
      className="rounded-lg border border-hud-border bg-hud-bg px-2 py-1.5 text-sm text-white outline-none focus:border-sky-400/60"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-[#17171d]">
          {t("sort")}: {opt.label}
        </option>
      ))}
    </select>
  );
}
