import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Quest, Subtask } from "../types";
import type { XpFeedbackEvent } from "../store/questStore";
import { ProgressBar } from "./ProgressBar";
import { SubTaskItem } from "./SubTaskItem";
import { DifficultyBadge } from "./DifficultyBadge";
import { useTranslation } from "../i18n";
import { PriorityIndicator } from "./PriorityIndicator";

interface ManagerQuestCardProps {
  quest: Quest;
  subtasks: Subtask[];
  onToggleSubtask: (subtaskId: string) => void;
  onEdit: (quest: Quest) => void;
  onDelete: (questId: string) => void;
  onArchive: (questId: string) => void;
  onRestore: (questId: string) => void;
  /** Marks a subtask-less quest Completed directly (awards its full XP reward). */
  onComplete: (questId: string) => void;
  onToggleOverlayPinned: (questId: string, pinned: boolean) => void;
  /** subtaskId -> latest XP feedback event, for the floating "+N XP" / "Great Job!" animation. */
  xpEvents?: Record<string, XpFeedbackEvent>;
  onXpEventConsumed?: (subtaskId: string) => void;
}

/**
 * Quest Manager list card. Active/Completed quests are collapsible (Completed
 * quests start collapsed and gray-themed; the backlog/archive workflow column
 * remains editable so newly created quests can be prepared before activation.
 */
export function ManagerQuestCard({
  quest,
  subtasks,
  onToggleSubtask,
  onEdit,
  onDelete,
  onArchive,
  onRestore,
  onComplete,
  onToggleOverlayPinned,
  xpEvents,
  onXpEventConsumed,
}: ManagerQuestCardProps): JSX.Element {
  const t = useTranslation();
  const [expanded, setExpanded] = useState(quest.status === "Active");
  const completedCount = subtasks.filter((s) => s.completed).length;
  const isCompleted = quest.status === "Completed";
  const isArchived = quest.status === "Archived";
  const cardTone = isCompleted
    ? "border-emerald-300/25 bg-emerald-400/[0.08]"
    : isArchived
      ? "border-slate-300/15 bg-slate-300/[0.06]"
      : "border-sky-300/25 bg-sky-400/[0.08]";

  return (
    <motion.div
      layout
      animate={{
        boxShadow: quest.showInOverlay
          ? "0 0 0 1px rgba(52,211,153,0.45), 0 0 22px rgba(16,185,129,0.2)"
          : "0 8px 32px rgba(0,0,0,0.3)",
      }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`w-full rounded-hud border p-3 backdrop-blur-hud transition-colors ${cardTone}`}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <span className="text-white/50">{expanded ? "▼" : "▶️"}</span>
          <PriorityIndicator priority={quest.priority} />
          <span className="truncate text-sm font-semibold text-white">{quest.title}</span>
        </button>
        <div className="flex items-center gap-2">
          {!isArchived && (
          <motion.button
            type="button"
            onClick={() => onToggleOverlayPinned(quest.id, !quest.showInOverlay)}
            title={quest.showInOverlay ? t("widgetHide") : t("widgetShow")}
            aria-label={quest.showInOverlay ? t("widgetHide") : t("widgetShow")}
            aria-pressed={quest.showInOverlay}
            whileTap={{ scale: 0.94 }}
            animate={{
              backgroundColor: quest.showInOverlay ? "rgba(16,185,129,0.28)" : "rgba(255,255,255,0.08)",
              color: quest.showInOverlay ? "#d1fae5" : "rgba(255,255,255,0.65)",
            }}
            transition={{ duration: 0.2 }}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
              quest.showInOverlay
                ? "border-emerald-300/70 shadow-[0_0_14px_rgba(16,185,129,0.25)]"
                : "border-hud-border hover:text-white"
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="13" rx="2" />
              <path d="M8 21h8M12 17v4" />
            </svg>
            {t("widget")}
          </motion.button>
          )}
          <DifficultyBadge difficulty={quest.difficulty} variant="full" />
        </div>
      </div>

      <div className="mt-2 flex items-center gap-3 text-xs text-white/60">
        <span>{quest.priority} {t("prioritySuffix")}</span>
        <span>·</span>
        <span>{quest.category}</span>
        {quest.dueDate && (
          <>
            <span>·</span>
            <span>{t("due")} {new Date(quest.dueDate).toLocaleDateString()}</span>
          </>
        )}
      </div>

      <div className="mt-2">
        <ProgressBar percentage={quest.completionPercentage} />
        <div className="mt-1 flex items-center justify-between text-[11px] text-white/50">
          <span>
            {completedCount}/{subtasks.length} {t("subtasks")}
          </span>
          <span>{quest.completionPercentage}%</span>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
            className="overflow-hidden"
          >
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

            {subtasks.length === 0 && !isCompleted && !isArchived && (
              <button
                type="button"
                onClick={() => onComplete(quest.id)}
                className="mt-2 rounded-md border border-emerald-300/30 bg-emerald-400/10 px-2 py-1 text-xs font-medium text-emerald-300 hover:bg-emerald-400/20"
              >
                {t("markComplete")} · +{quest.xpReward} XP
              </button>
            )}

            {isCompleted && (
              <p className="mt-2 text-xs font-medium text-emerald-300">
                {t("completed")} · +{quest.xpReward} XP
              </p>
            )}

            <div className="mt-3 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => onEdit(quest)}
                className="rounded-md px-2 py-1 text-sky-300 hover:bg-white/10"
              >
                {t("edit")}
              </button>
              {!isArchived ? (
                <button
                  type="button"
                  onClick={() => onArchive(quest.id)}
                  className="rounded-md px-2 py-1 text-white/60 hover:bg-white/10"
                >
                  {t("archive")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onRestore(quest.id)}
                  className="rounded-md px-2 py-1 text-emerald-300 hover:bg-white/10"
                >
                  {t("restore")}
                </button>
              )}
              <button
                type="button"
                onClick={() => onDelete(quest.id)}
                className="rounded-md px-2 py-1 text-red-300 hover:bg-white/10"
              >
                {t("delete")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
