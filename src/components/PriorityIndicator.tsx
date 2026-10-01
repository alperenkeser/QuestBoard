import type { Priority } from "../types";

interface PriorityIndicatorProps {
  priority: Priority;
  className?: string;
}

const PRIORITY_COLORS: Record<Priority, string> = {
  Low: "text-slate-300",
  Medium: "text-sky-300",
  High: "text-amber-300",
  Critical: "text-rose-300",
};

export function PriorityIndicator({
  priority,
  className = "h-4 w-4",
}: PriorityIndicatorProps): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} shrink-0 ${PRIORITY_COLORS[priority]}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={`${priority} priority`}
    >
      <title>{priority} priority</title>
      {priority === "Critical" ? (
        <>
          <path d="M12 20V5M6 11l6-6 6 6M6 17l6-6 6 6" />
        </>
      ) : priority === "High" ? (
        <path d="M12 19V5M6 11l6-6 6 6" />
      ) : priority === "Medium" ? (
        <>
          <path d="M5 9h14M5 15h14" />
          <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
        </>
      ) : (
        <path d="M12 5v14m6-6-6 6-6-6" />
      )}
    </svg>
  );
}
