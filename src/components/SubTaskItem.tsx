import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import type { Subtask } from "../types";
import type { XpFeedbackEvent } from "../store/questStore";
import { XpFloatingText } from "./XpFloatingText";

interface SubTaskItemProps {
  subtask: Subtask;
  onToggle: (id: string) => void;
  /** Latest XP award/undo tied to this subtask, if any, to drive floating feedback. */
  xpEvent?: XpFeedbackEvent;
  /** Called once the feedback has finished animating so the caller can clear it from the store. */
  onXpEventConsumed?: (subtaskId: string) => void;
  fontSize?: number;
}

/**
 * Renders a single quest subtask as a checkbox row.
 * ○ -> ✓ with a fade + scale transition, plus a floating "+N XP" and a
 * "Great Job!" toast when a completion awards XP.
 */
export function SubTaskItem({
  subtask,
  onToggle,
  xpEvent,
  onXpEventConsumed,
  fontSize = 14,
}: SubTaskItemProps): JSX.Element {
  useEffect(() => {
    if (!xpEvent) return;
    const timer = setTimeout(() => onXpEventConsumed?.(subtask.id), 1200);
    return () => clearTimeout(timer);
  }, [xpEvent, subtask.id, onXpEventConsumed]);

  return (
    <button
      type="button"
      onClick={() => onToggle(subtask.id)}
      className="no-drag relative flex w-full items-center gap-2 rounded-md px-1 py-0.5 text-left text-xs text-white/80 transition-colors hover:bg-white/5"
    >
      <span className="relative flex h-4 w-4 items-center justify-center">
        <AnimatePresence mode="wait" initial={false}>
          {subtask.completed ? (
            <motion.span
              key="checked"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="text-emerald-400"
            >
              ✓
            </motion.span>
          ) : (
            <motion.span
              key="unchecked"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="text-white/40"
            >
              ○
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      <span
        className={subtask.completed ? "text-white/40 line-through" : ""}
        style={{ fontSize }}
      >
        {subtask.title}
      </span>

      <AnimatePresence>
        {xpEvent && (
          <motion.span
            key={xpEvent.nonce}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="pointer-events-none absolute -top-3 right-1 whitespace-nowrap text-[10px] font-semibold text-emerald-300"
          >
            {xpEvent.amount > 0 && "Great Job!"}
          </motion.span>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {xpEvent && (
          <span className="pointer-events-none absolute right-6 top-0">
            <XpFloatingText key={xpEvent.nonce} amount={xpEvent.amount} />
          </span>
        )}
      </AnimatePresence>
    </button>
  );
}
