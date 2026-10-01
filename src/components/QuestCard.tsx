import { motion } from "framer-motion";
import type { Quest, Subtask } from "../types";
import type { XpFeedbackEvent } from "../store/questStore";
import { ProgressBar } from "./ProgressBar";
import { SubTaskItem } from "./SubTaskItem";
import { DifficultyBadge } from "./DifficultyBadge";
import { useTranslation } from "../i18n";
import { PriorityIndicator } from "./PriorityIndicator";

interface QuestCardProps {
  quest: Quest;
  subtasks: Subtask[];
  onToggleSubtask: (subtaskId: string) => void;
  onComplete: (questId: string) => void;
  collapsed?: boolean;
  onToggleCollapsed?: (questId: string) => void;
  /** subtaskId -> latest XP feedback event, for the floating "+N XP" / "Great Job!" animation. */
  xpEvents?: Record<string, XpFeedbackEvent>;
  onXpEventConsumed?: (subtaskId: string) => void;
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
  collapsed = false,
  onToggleCollapsed,
  xpEvents,
  onXpEventConsumed,
}: QuestCardProps): JSX.Element {
  const t = useTranslation();
  const handleComplete = () => {
    if (subtasks.length === 0) {
      onComplete(quest.id);
      return;
    }
    subtasks
      .filter((subtask) => !subtask.completed)
      .forEach((subtask) => onToggleSubtask(subtask.id));
  };

  return (
    <motion.div
      className="w-full rounded-hud border border-hud-border bg-hud-bg p-3 shadow-hud backdrop-blur-hud transition-colors hover:border-white/25"
      style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.45)" }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <PriorityIndicator priority={quest.priority} />
          <h3 className="truncate text-sm font-semibold text-white">{quest.title}</h3>
        </div>
        <div className="flex items-center gap-1">
          <DifficultyBadge difficulty={quest.difficulty} variant="icon" />
          {onToggleCollapsed && (
            <button
              type="button"
              onClick={() => onToggleCollapsed(quest.id)}
              className="no-drag rounded px-1.5 py-0.5 text-[10px] font-semibold text-white/55 hover:bg-white/10 hover:text-white"
              title={collapsed ? "Kartı büyüt" : "Kartı küçült"}
            >
              {collapsed ? "▣" : "—"}
            </button>
          )}
          {quest.status !== "Completed" && (
            <button
              type="button"
              onClick={handleComplete}
              className="no-drag grid h-7 w-7 place-items-center rounded-full border border-emerald-300/50 bg-emerald-400/15 text-emerald-200 transition-colors hover:bg-emerald-400/30 hover:text-white active:scale-95"
              title={
                subtasks.length > 0
                  ? `${t("markComplete")} · ${t("subtasksLabel")}`
                  : `${t("markComplete")} · +${quest.xpReward} XP`
              }
              aria-label={t("markComplete")}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m5 12 4 4L19 6" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {!collapsed && (
        <>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-white/60">
            <span className="inline-flex items-center gap-1">
              <PriorityIndicator priority={quest.priority} className="h-3.5 w-3.5" />
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
                xpEvent={xpEvents?.[subtask.id]}
                onXpEventConsumed={onXpEventConsumed}
              />
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}
