import type { Difficulty, Priority, Quest, QuestFormInput, QuestStatus, Subtask } from "../types";
import type { QuestFormPayloadDto, QuestRowDto, SubtaskRowDto } from "../types/bridge";
import { xpForDifficulty } from "../types";

function toQuest(row: QuestRowDto): Omit<Quest, "completionPercentage"> {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority as Priority,
    difficulty: row.difficulty as Difficulty,
    xpReward: row.xpReward,
    status: row.status as QuestStatus,
    category: row.category,
    createdDate: row.createdDate,
    updatedDate: row.updatedDate,
    dueDate: row.dueDate,
    showInOverlay: row.showInOverlay === 1,
    boardColumnId: row.boardColumnId,
    boardOrder: row.boardOrder,
    azureSprintBoardId: row.azureSprintBoardId,
    azureWorkItemId: row.azureWorkItemId,
  };
}

function toSubtask(row: SubtaskRowDto): Subtask {
  return {
    id: row.id,
    questId: row.questId,
    title: row.title,
    completed: row.completed === 1,
    order: row.orderIndex,
  };
}

function toPayload(
  input: QuestFormInput,
  boardColumnId = "backlog",
  status = "Archived"
): QuestFormPayloadDto {
  return {
    title: input.title,
    description: input.description,
    priority: input.priority,
    difficulty: input.difficulty,
    xpReward: xpForDifficulty(input.difficulty),
    category: input.category,
    dueDate: input.dueDate,
    subtaskTitles: input.subtaskTitles,
    boardColumnId,
    status,
  };
}

/**
 * Renderer-side data-access layer for quests/subtasks. Talks to the main
 * process exclusively through the window.questboard.db bridge exposed by
 * preload.ts — never touches SQLite directly. Zustand calls this, not React.
 */
export const QuestService = {
  async getAllWithSubtasks(): Promise<{ quests: Array<Omit<Quest, "completionPercentage">>; subtasks: Subtask[] }> {
    const { quests, subtasks } = await window.questboard.db.quests.getAllWithSubtasks();
    return { quests: quests.map(toQuest), subtasks: subtasks.map(toSubtask) };
  },

  create(input: QuestFormInput, boardColumnId: string): Promise<string> {
    return window.questboard.db.quests.create(toPayload(input, boardColumnId));
  },

  update(questId: string, input: QuestFormInput): Promise<void> {
    return window.questboard.db.quests.update(questId, toPayload(input));
  },

  delete(questId: string): Promise<void> {
    return window.questboard.db.quests.delete(questId);
  },

  setStatus(questId: string, status: QuestStatus): Promise<void> {
    return window.questboard.db.quests.setStatus(questId, status);
  },

  setBoardColumn(questId: string, columnId: string): Promise<void> {
    return window.questboard.db.quests.setBoardColumn(questId, columnId);
  },

  setOverlayPinned(questId: string, pinned: boolean): Promise<void> {
    return window.questboard.db.quests.setOverlayPinned(questId, pinned);
  },

  async toggleSubtask(subtaskId: string): Promise<Subtask> {
    const row = await window.questboard.db.subtasks.toggle(subtaskId);
    return toSubtask(row);
  },

  addSubtask(questId: string, title: string, orderIndex: number): Promise<string> {
    return window.questboard.db.subtasks.add(questId, title, orderIndex);
  },

  removeSubtask(subtaskId: string): Promise<void> {
    return window.questboard.db.subtasks.remove(subtaskId);
  },

  reorderSubtasks(questId: string, orderedSubtaskIds: string[]): Promise<void> {
    return window.questboard.db.subtasks.reorder(questId, orderedSubtaskIds);
  },

  onChanged(callback: () => void): () => void {
    return window.questboard.onDbChanged(callback);
  },

  onOverlayPinChanged(callback: (questId: string, pinned: boolean) => void): () => void {
    return window.questboard.onOverlayPinChanged(callback);
  },
};
