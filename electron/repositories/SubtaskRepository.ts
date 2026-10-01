import { getDb } from "../database/sqlite";
import type { SubtaskRow } from "../database/rowTypes";

export interface CreateSubtaskInput {
  id: string;
  questId: string;
  title: string;
  orderIndex: number;
}

/** Raw SQL access to the `subtasks` table. No business logic lives here. */
export const SubtaskRepository = {
  getByQuestId(questId: string): SubtaskRow[] {
    return getDb()
      .prepare("SELECT * FROM subtasks WHERE questId = ? ORDER BY orderIndex ASC")
      .all(questId) as SubtaskRow[];
  },

  getAll(): SubtaskRow[] {
    return getDb().prepare("SELECT * FROM subtasks ORDER BY questId, orderIndex ASC").all() as SubtaskRow[];
  },

  create(input: CreateSubtaskInput): void {
    getDb()
      .prepare(
        "INSERT INTO subtasks (id, questId, title, completed, orderIndex) VALUES (@id, @questId, @title, 0, @orderIndex)"
      )
      .run(input);
  },

  /** Flips `completed` and returns the updated row. */
  toggle(id: string): SubtaskRow | undefined {
    const db = getDb();
    db.prepare("UPDATE subtasks SET completed = 1 - completed WHERE id = ?").run(id);
    return db.prepare("SELECT * FROM subtasks WHERE id = ?").get(id) as SubtaskRow | undefined;
  },

  remove(id: string): void {
    getDb().prepare("DELETE FROM subtasks WHERE id = ?").run(id);
  },

  removeByQuestId(questId: string): void {
    getDb().prepare("DELETE FROM subtasks WHERE questId = ?").run(questId);
  },

  reorder(questId: string, orderedIds: string[]): void {
    const db = getDb();
    const stmt = db.prepare("UPDATE subtasks SET orderIndex = ? WHERE id = ? AND questId = ?");
    const reorderTransaction = db.transaction((ids: string[]) => {
      ids.forEach((id, index) => stmt.run(index, id, questId));
    });
    reorderTransaction(orderedIds);
  },

  /** Replaces every subtask belonging to a quest with a new title list (used by quest edit). */
  replaceForQuest(questId: string, titles: string[], idFactory: () => string): void {
    const db = getDb();
    const existing = this.getByQuestId(questId);

    const replaceTransaction = db.transaction(() => {
      db.prepare("DELETE FROM subtasks WHERE questId = ?").run(questId);
      const insert = db.prepare(
        "INSERT INTO subtasks (id, questId, title, completed, orderIndex) VALUES (?, ?, ?, ?, ?)"
      );
      titles.forEach((title, index) => {
        // Preserve completion state for subtasks whose title/position match an existing one.
        const match = existing.find((s) => s.orderIndex === index && s.title === title);
        insert.run(match?.id ?? idFactory(), questId, title, match?.completed ?? 0, index);
      });
    });
    replaceTransaction();
  },
};
