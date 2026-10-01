import type { Subtask } from "../types";

/**
 * completedSubtasks / totalSubtasks, expressed as an integer percentage (0-100).
 * A quest with no subtasks is treated as 0% until subtasks exist.
 */
export function computeCompletionPercentage(subtasks: Subtask[]): number {
  if (subtasks.length === 0) return 0;
  const completed = subtasks.filter((s) => s.completed).length;
  return Math.round((completed / subtasks.length) * 100);
}

/** XP awarded per subtask when a quest's reward is split evenly across its subtasks. */
export function xpPerSubtask(xpReward: number, totalSubtasks: number): number {
  if (totalSubtasks === 0) return 0;
  return Math.round(xpReward / totalSubtasks);
}
