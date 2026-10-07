import { getDb } from "../database/sqlite";
import type { AzureSprintBoardRow, QuestRow, SubtaskRow } from "../database/rowTypes";
import type { BoardColumnRecord } from "./SettingsRepository";
import type { AzureDevOpsSprintDto, AzureDevOpsTaskDto } from "../azureDevOps";

export interface SprintBoardSyncInput {
  sourceKey: string;
  sprint: AzureDevOpsSprintDto;
  tasks: AzureDevOpsTaskDto[];
  columns: BoardColumnRecord[];
  syncedAt: string;
  createId: () => string;
}

export const AzureSprintBoardRepository = {
  getAll(): AzureSprintBoardRow[] {
    return getDb()
      .prepare("SELECT * FROM azure_sprint_boards ORDER BY startDate DESC, name COLLATE NOCASE")
      .all() as AzureSprintBoardRow[];
  },

  getQuestsForBoard(boardId: string): { quests: QuestRow[]; subtasks: SubtaskRow[] } {
    const database = getDb();
    return {
      quests: database
        .prepare("SELECT * FROM quests WHERE azureSprintBoardId = ? ORDER BY boardOrder, createdDate")
        .all(boardId) as QuestRow[],
      subtasks: database
        .prepare(
          `SELECT subtasks.* FROM subtasks
           INNER JOIN quests ON quests.id = subtasks.questId
           WHERE quests.azureSprintBoardId = ?
           ORDER BY subtasks.questId, subtasks.orderIndex`
        )
        .all(boardId) as SubtaskRow[],
    };
  },

  synchronize(input: SprintBoardSyncInput): AzureSprintBoardRow {
    const database = getDb();
    const transaction = database.transaction(() => {
      const existingBoard = database
        .prepare("SELECT id, createdDate FROM azure_sprint_boards WHERE sourceKey = ? AND remoteId = ?")
        .get(input.sourceKey, input.sprint.id) as { id: string; createdDate: string } | undefined;
      const boardId = existingBoard?.id ?? input.createId();
      const createdDate = existingBoard?.createdDate ?? input.syncedAt;

      database
        .prepare(
          `INSERT INTO azure_sprint_boards
           (id, sourceKey, remoteId, name, path, startDate, finishDate, timeFrame, lastSyncedDate, createdDate, updatedDate)
           VALUES (@id, @sourceKey, @remoteId, @name, @path, @startDate, @finishDate, @timeFrame, @lastSyncedDate, @createdDate, @updatedDate)
           ON CONFLICT(sourceKey, remoteId) DO UPDATE SET
             name=excluded.name, path=excluded.path, startDate=excluded.startDate,
             finishDate=excluded.finishDate, timeFrame=excluded.timeFrame,
             lastSyncedDate=excluded.lastSyncedDate, updatedDate=excluded.updatedDate`
        )
        .run({
          id: boardId,
          sourceKey: input.sourceKey,
          remoteId: input.sprint.id,
          name: input.sprint.name,
          path: input.sprint.path,
          startDate: input.sprint.startDate,
          finishDate: input.sprint.finishDate,
          timeFrame: input.sprint.timeFrame,
          lastSyncedDate: input.syncedAt,
          createdDate,
          updatedDate: input.syncedAt,
        });

      const columnForState = (state: string): BoardColumnRecord => {
        const normalized = state.trim().toLowerCase();
        const targetStatus = ["completed", "done", "closed", "resolved"].includes(normalized)
          ? "Completed"
          : ["active", "in progress", "in-progress", "doing", "committed"].includes(normalized)
            ? "Active"
            : "Archived";
        const column = input.columns.find((candidate) => candidate.status === targetStatus);
        if (!column) throw new Error(`The workflow board is missing its ${targetStatus} column.`);
        return column;
      };

      const findQuest = database.prepare(
        "SELECT id, boardOrder FROM quests WHERE azureSourceKey = ? AND azureWorkItemId = ?"
      );
      const insertQuest = database.prepare(
        `INSERT INTO quests
         (id, title, description, difficulty, xpReward, priority, category, status, createdDate, updatedDate,
          dueDate, showInOverlay, boardColumnId, boardOrder, azureSprintBoardId, azureSourceKey, azureWorkItemId)
         VALUES (@id, @title, @description, 'Medium', 250, 'Medium', 'Azure DevOps', @status, @createdDate, @updatedDate,
          @dueDate, 0, @boardColumnId, @boardOrder, @azureSprintBoardId, @azureSourceKey, @azureWorkItemId)`
      );
      const updateQuest = database.prepare(
        `UPDATE quests SET title=@title, description=@description, dueDate=@dueDate,
         status=@status, boardColumnId=@boardColumnId, azureSprintBoardId=@azureSprintBoardId,
         updatedDate=@updatedDate WHERE id=@id`
      );

      input.tasks.forEach((task, index) => {
        const existingQuest = findQuest.get(input.sourceKey, String(task.id)) as
          | { id: string; boardOrder: number }
          | undefined;
        const column = columnForState(task.state);
        const values = {
          id: existingQuest?.id ?? input.createId(),
          title: task.title,
          description: task.description,
          dueDate: input.sprint.finishDate,
          status: column.status,
          boardColumnId: column.id,
          boardOrder: existingQuest?.boardOrder ?? index,
          azureSprintBoardId: boardId,
          azureSourceKey: input.sourceKey,
          azureWorkItemId: String(task.id),
          createdDate: input.syncedAt,
          updatedDate: input.syncedAt,
        };

        if (existingQuest) {
          updateQuest.run(values);
        } else {
          insertQuest.run(values);
        }
      });

      return database
        .prepare("SELECT * FROM azure_sprint_boards WHERE id = ?")
        .get(boardId) as AzureSprintBoardRow;
    });

    return transaction();
  },
};
