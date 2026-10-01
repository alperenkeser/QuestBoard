import type { QuestStatus } from "../types";
import { motion } from "framer-motion";

export type FilterValue = "All" | QuestStatus;

interface FilterTabsProps {
  value: FilterValue;
  onChange: (value: FilterValue) => void;
  counts: Record<FilterValue, number>;
}

const TABS: FilterValue[] = ["All", "Active", "Completed", "Archived"];

/** Narrows the Quest Manager to a single status section, or "All" to show every section. */
export function FilterTabs({ value, onChange, counts }: FilterTabsProps): JSX.Element {
  return (
    <div className="flex gap-1 rounded-lg border border-hud-border bg-hud-bg p-1">
      {TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={`relative rounded-md px-3 py-1 text-sm font-medium transition-colors ${
            value === tab ? "text-sky-300" : "text-white/60 hover:text-white"
          }`}
        >
          {value === tab && (
            <motion.span
              layoutId="filter-tab-pill"
              className="absolute inset-0 rounded-md bg-sky-400/20"
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
            />
          )}
          <span className="relative">
            {tab} <span className="text-xs text-white/40">({counts[tab]})</span>
          </span>
        </button>
      ))}
    </div>
  );
}
