import { motion } from "framer-motion";
import type { Quest, Subtask } from "../types";
import type { XpFeedbackEvent } from "../store/questStore";
import { ProgressBar } from "./ProgressBar";
import { SubTaskItem } from "./SubTaskItem";
import { useTranslation } from "../i18n";
import { PriorityIndicator } from "./PriorityIndicator";

interface QuestCardProps {
  quest: Quest;
  subtasks: Subtask[];
  onToggleSubtask: (subtaskId: string) => void;
  onComplete: (questId: string) => void;
  onRemoveFromOverlay: (questId: string) => void;
  collapsed?: boolean;
  onToggleCollapsed?: (questId: string) => void;
  /** subtaskId -> latest XP feedback event, for the floating "+N XP" / "Great Job!" animation. */
  xpEvents?: Record<string, XpFeedbackEvent>;
  onXpEventConsumed?: (subtaskId: string) => void;
  fontSize?: number;
  showIconsOnHover?: boolean;
  clickThroughEnabled?: boolean;
}

/**
 * Glassmorphic quest tracker card:
 * rgba(255,255,255,0.08) background, 20px blur, 20px radius, subtle border.
 */
export function QuestCard({
  quest,
  subtasks,
  onToggleSubtask,
  onComplete,
  onRemoveFromOverlay,
  collapsed = false,
  onToggleCollapsed,
  xpEvents,
  onXpEventConsumed,
  fontSize = 14,
  showIconsOnHover = true,
  clickThroughEnabled = false,
}: QuestCardProps): JSX.Element {
  const t = useTranslation();
  const handleComplete = () => {
    if (subtasks.length === 0 || subtasks.every((subtask) => subtask.completed)) {
      onComplete(quest.id);
      return;
    }
    subtasks
      .filter((subtask) => !subtask.completed)
      .forEach((subtask) => onToggleSubtask(subtask.id));
  };

  return (
    <motion.div
      className="group w-full rounded-hud border border-hud-border bg-hud-bg p-3 backdrop-blur-hud transition-colors hover:border-white/25"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          {onToggleCollapsed ? (
            <button
              type="button"
              onClick={() => onToggleCollapsed(quest.id)}
              aria-expanded={!collapsed}
              className="no-drag block w-full truncate pl-2 text-left font-semibold text-white"
              style={{ fontSize }}
              title={collapsed ? "Kartı genişlet" : "Kartı daralt"}
            >
              {quest.title}
            </button>
          ) : (
            <h3 className="truncate pl-2 font-semibold text-white" style={{ fontSize }}>
              {quest.title}
            </h3>
          )}
        </div>
        {!clickThroughEnabled && (
          <button
            type="button"
            onClick={() => onRemoveFromOverlay(quest.id)}
            className="no-drag grid h-7 w-7 place-items-center rounded-full border border-white/20 bg-white/5 text-white/65 transition-colors hover:border-red-300/50 hover:bg-red-400/15 hover:text-red-200 active:scale-95"
            title={t("widgetHide")}
            aria-label={t("widgetHide")}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        )}
      </div>

      {!collapsed && (
        <>
          <div
            className="mt-1 flex items-center gap-2 text-white/60"
            style={{ fontSize: Math.max(10, fontSize - 2) }}
          >
            <span className="inline-flex items-center gap-1">
              <PriorityIndicator
                priority={quest.priority}
                className={`h-3.5 w-3.5 ${showIconsOnHover ? "opacity-40 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100" : ""}`}
              />
              {quest.priority} {t("prioritySuffix")}
            </span>
            {quest.dueDate && (
              <>
                <span>·</span>
                <span>
                  {t("due")} {new Date(quest.dueDate).toLocaleDateString()}
                </span>
              </>
            )}
          </div>
          <div className="mt-2">
            <ProgressBar percentage={quest.completionPercentage} />
          </div>

          <div className="mt-2 flex flex-col gap-0.5">
            {subtasks.map((subtask) => (
              <SubTaskItem
                key={subtask.id}
                subtask={subtask}
                onToggle={onToggleSubtask}
                fontSize={fontSize}
                xpEvent={xpEvents?.[subtask.id]}
                onXpEventConsumed={onXpEventConsumed}
              />
            ))}
          </div>
          {quest.status !== "Completed" && !clickThroughEnabled && (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={handleComplete}
                className="no-drag grid h-8 w-8 place-items-center rounded-full border border-emerald-300/50 bg-emerald-400/15 text-emerald-200 transition-colors hover:bg-emerald-400/30 hover:text-white active:scale-95"
                title={
                  subtasks.length > 0
                    ? `${t("markComplete")} · ${t("subtasksLabel")}`
                    : `${t("markComplete")} · +${quest.xpReward} XP`
                }
                aria-label={t("markComplete")}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m5 12 4 4L19 6" />
                </svg>
              </button>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
