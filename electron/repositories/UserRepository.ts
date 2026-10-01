import { getDb } from "../database/sqlite";
import type { UserRow } from "../database/rowTypes";

const LOCAL_USER_ID = "local-player";

// Matches the level curve from the product spec (Level 1 = 0 XP ... Level 5 = 9000 XP).
// Levels beyond 5 keep growing so progression never hard-caps.
const LEVEL_THRESHOLDS = [0, 1000, 2500, 5000, 9000];

export function calcLevelForXp(totalXp: number): number {
  let level = 1;
  let threshold = 0;
  let delta = 1000;

  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalXp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      threshold = LEVEL_THRESHOLDS[i];
      delta = i > 0 ? LEVEL_THRESHOLDS[i] - LEVEL_THRESHOLDS[i - 1] : 1000;
    }
  }

  // Beyond the last defined threshold, keep leveling with a gradually growing requirement.
  let nextThreshold = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  let nextDelta = delta * 1.5;
  while (totalXp >= nextThreshold + nextDelta) {
    nextThreshold += nextDelta;
    nextDelta *= 1.5;
    level += 1;
  }

  return level;
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * Resets the daily-only counters (dailyCompletedTasks/Quests/EarnedXp) the
 * first time the repository is touched on a new calendar day. `lastActiveDate`
 * doubles as that day-stamp — it's only ever compared/set here, never shown
 * as a real timestamp to the UI.
 */
function rolloverIfNewDay(): void {
  const db = getDb();
  const row = db
    .prepare("SELECT lastActiveDate FROM users WHERE id = ?")
    .get(LOCAL_USER_ID) as { lastActiveDate: string | null } | undefined;
  if (!row) return;

  const today = todayStamp();
  if (row.lastActiveDate !== today) {
    db.prepare(
      `UPDATE users SET dailyCompletedTasks = 0, dailyCompletedQuests = 0, dailyEarnedXp = 0,
       lastActiveDate = ? WHERE id = ?`
    ).run(today, LOCAL_USER_ID);
  }
}

/** Raw SQL access to the singleton local `users` row. */
export const UserRepository = {
  get(): UserRow {
    rolloverIfNewDay();
    return getDb().prepare("SELECT * FROM users WHERE id = ?").get(LOCAL_USER_ID) as UserRow;
  },

  addXp(amount: number): UserRow {
    const db = getDb();
    const current = this.get();
    const totalXp = current.totalXp + amount;
    const dailyEarnedXp = current.dailyEarnedXp + amount;
    const level = calcLevelForXp(totalXp);
    const updatedDate = new Date().toISOString();

    db.prepare(
      "UPDATE users SET totalXp = ?, level = ?, dailyEarnedXp = ?, updatedDate = ? WHERE id = ?"
    ).run(totalXp, level, dailyEarnedXp, updatedDate, LOCAL_USER_ID);

    return { ...current, totalXp, level, dailyEarnedXp, updatedDate };
  },

  incrementCompletedQuests(): UserRow {
    const current = this.get();
    const completedQuests = current.completedQuests + 1;
    const dailyCompletedQuests = current.dailyCompletedQuests + 1;
    const updatedDate = new Date().toISOString();

    getDb()
      .prepare(
        `UPDATE users SET completedQuests = ?, dailyCompletedQuests = ?, updatedDate = ? WHERE id = ?`
      )
      .run(completedQuests, dailyCompletedQuests, updatedDate, LOCAL_USER_ID);

    return { ...current, completedQuests, dailyCompletedQuests, updatedDate };
  },

  incrementDailyCompletedTasks(): UserRow {
    const current = this.get();
    const dailyCompletedTasks = current.dailyCompletedTasks + 1;
    const updatedDate = new Date().toISOString();

    getDb()
      .prepare("UPDATE users SET dailyCompletedTasks = ?, updatedDate = ? WHERE id = ?")
      .run(dailyCompletedTasks, updatedDate, LOCAL_USER_ID);

    return { ...current, dailyCompletedTasks, updatedDate };
  },
};
