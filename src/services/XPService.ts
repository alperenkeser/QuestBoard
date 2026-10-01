import type { User } from "../types";
import type { UserRowDto } from "../types/bridge";

function toUser(row: UserRowDto): User {
  return { ...row };
}

/**
 * Renderer-side data-access layer for the local player's XP/level profile.
 * Phase 4 only wires basic read/award primitives; the full leveling UI
 * (progress bar, level-up celebration, achievement unlocks) lands in Phase 5.
 */
export const XPService = {
  async get(): Promise<User> {
    const row = await window.questboard.db.user.get();
    return toUser(row);
  },

  async addXp(amount: number): Promise<User> {
    const row = await window.questboard.db.user.addXp(amount);
    return toUser(row);
  },

  async incrementCompletedQuests(): Promise<User> {
    const row = await window.questboard.db.user.incrementCompletedQuests();
    return toUser(row);
  },

  async incrementDailyCompletedTasks(): Promise<User> {
    const row = await window.questboard.db.user.incrementDailyCompletedTasks();
    return toUser(row);
  },
};
