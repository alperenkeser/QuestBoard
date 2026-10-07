export type Priority = "Low" | "Medium" | "High" | "Critical";

export type QuestStatus = "Active" | "Completed" | "Archived";
export interface BoardColumn {
  id: string;
  title: string;
  status: QuestStatus;
}

export interface Subtask {
  id: string;
  questId: string;
  title: string;
  completed: boolean;
  /** Position within its quest's subtask list; drives drag-and-drop ordering. */
  order: number;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  difficulty: import("./difficulty").Difficulty;
  xpReward: number;
  completionPercentage: number;
  status: QuestStatus;
  category: string;
  createdDate: string;
  updatedDate: string;
  dueDate: string | null;
  showInOverlay: boolean;
  boardColumnId: string;
  boardOrder: number;
  azureSprintBoardId: string | null;
  azureWorkItemId: string | null;
}

export interface QuestFormInput {
  title: string;
  description: string;
  priority: Priority;
  difficulty: import("./difficulty").Difficulty;
  category: string;
  dueDate: string | null;
  /** Subtask titles in display order. Used on both create and full-replace edit. */
  subtaskTitles: string[];
}

// Priority order used to sort the overlay HUD, highest first.
export const PRIORITY_WEIGHT: Record<Priority, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};
