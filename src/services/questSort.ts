import type { Quest } from "../types";
import { PRIORITY_WEIGHT } from "../types";
import type { SortKey } from "../components/SortControl";

/**
 * Sorts quests for the Quest Manager list view.
 * priority: highest first. dateCreated: newest first. dueDate: soonest first
 * (quests with no due date sort last). xpReward: highest first.
 */
export function sortQuests(quests: Quest[], sortKey: SortKey): Quest[] {
  const sorted = [...quests];

  switch (sortKey) {
    case "priority":
      return sorted.sort((a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]);
    case "dateCreated":
      return sorted.sort(
        (a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
      );
    case "dueDate":
      return sorted.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    case "xpReward":
      return sorted.sort((a, b) => b.xpReward - a.xpReward);
    default:
      return sorted;
  }
}
