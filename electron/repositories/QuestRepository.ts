import { getDb } from "../database/sqlite";
import type { QuestRow } from "../database/rowTypes";

export interface CreateQuestInput {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  xpReward: number;
  priority: string;
  category: string;
  dueDate: string | null;
  createdDate: string;
  updatedDate: string;
  showInOverlay: 0 | 1;
  boardColumnId: string;
  boardOrder: number;
  status: string;
}

export interface UpdateQuestInput {
  title: string;
  description: string;
  difficulty: string;
  xpReward: number;
  priority: string;
  category: string;
  dueDate: string | null;
  updatedDate: string;
}

/** Raw SQL access to the `quests` table. No business logic lives here. */
export const QuestRepository = {
  getAll(): QuestRow[] {
    return getDb().prepare("SELECT * FROM quests ORDER BY createdDate ASC").all() as QuestRow[];
  },

  getById(id: string): QuestRow | undefined {
    return getDb().prepare("SELECT * FROM quests WHERE id = ?").get(id) as QuestRow | undefined;
  },

  create(input: CreateQuestInput): void {
    getDb()
      .prepare(
        `INSERT INTO quests (id, title, description, difficulty, xpReward, priority, category, status, createdDate, updatedDate, dueDate, showInOverlay, boardColumnId, boardOrder)
         VALUES (@id, @title, @description, @difficulty, @xpReward, @priority, @category, @status, @createdDate, @updatedDate, @dueDate, @showInOverlay, @boardColumnId, @boardOrder)`
      )
      .run(input);
  },

  update(id: string, input: UpdateQuestInput): void {
    getDb()
      .prepare(
        `UPDATE quests SET title=@title, description=@description, difficulty=@difficulty,
         xpReward=@xpReward, priority=@priority, category=@category, dueDate=@dueDate, updatedDate=@updatedDate
         WHERE id=@id`
      )
      .run({ ...input, id });
  },

  setStatus(id: string, status: string, updatedDate: string, boardColumnId?: string): void {
    if (boardColumnId) {
      getDb()
        .prepare("UPDATE quests SET status = ?, boardColumnId = ?, updatedDate = ? WHERE id = ?")
        .run(status, boardColumnId, updatedDate, id);
      return;
    }
    getDb().prepare("UPDATE quests SET status = ?, updatedDate = ? WHERE id = ?").run(status, updatedDate, id);
  },

  setOverlayPinned(id: string, pinned: 0 | 1, updatedDate: string): void {
    getDb().prepare("UPDATE quests SET showInOverlay = ?, updatedDate = ? WHERE id = ?").run(pinned, updatedDate, id);
  },

  setBoardColumn(id: string, columnId: string, status: string, boardOrder: number, updatedDate: string): void {
    getDb()
      .prepare(
        `UPDATE quests SET boardColumnId = ?, status = ?, boardOrder = ?,
         showInOverlay = CASE WHEN ? IN ('Completed', 'Archived') THEN 0 ELSE showInOverlay END,
         updatedDate = ? WHERE id = ?`
      )
      .run(columnId, status, boardOrder, status, updatedDate, id);
  },

  delete(id: string): void {
    getDb().prepare("DELETE FROM quests WHERE id = ?").run(id);
  },
};
