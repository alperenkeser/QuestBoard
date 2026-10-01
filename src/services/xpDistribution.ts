import type { Quest, Subtask } from "../types";

export interface XpShare {
  subtaskId: string;
  xp: number;
}

/**
 * Splits a quest's XP reward evenly across its subtasks (in display order),
 * putting any remainder on the last subtask so the shares always sum to
 * exactly `xpReward` — no XP is lost or double-counted to rounding.
 */
export function distributeQuestXp(
  quest: Pick<Quest, "xpReward">,
  orderedSubtasks: Subtask[]
): XpShare[] {
  const n = orderedSubtasks.length;
  if (n === 0) return [];

  const base = Math.floor(quest.xpReward / n);
  const remainder = quest.xpReward - base * n;

  return orderedSubtasks.map((s, i) => ({
    subtaskId: s.id,
    xp: base + (i === n - 1 ? remainder : 0),
  }));
}

/** The XP a single subtask is worth once its quest's reward is distributed. */
export function xpShareForSubtask(
  quest: Pick<Quest, "xpReward">,
  orderedSubtasks: Subtask[],
  subtaskId: string
): number {
  return distributeQuestXp(quest, orderedSubtasks).find((s) => s.subtaskId === subtaskId)?.xp ?? 0;
}
