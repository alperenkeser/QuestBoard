export interface QuestRow {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  xpReward: number;
  priority: string;
  category: string;
  status: string;
  createdDate: string;
  updatedDate: string;
  dueDate: string | null;
  showInOverlay: 0 | 1;
  boardColumnId: string;
  boardOrder: number;
}

export interface SubtaskRow {
  id: string;
  questId: string;
  title: string;
  completed: 0 | 1;
  orderIndex: number;
}

export interface SettingsRow {
  id: 1;
  transparency: number;
  blurAmount: number;
  theme: string;
  alwaysOnTop: 0 | 1;
  launchOnStartup: 0 | 1;
  shortcut: string;
  overlayAnchor: string;
  overlayX: number | null;
  overlayY: number | null;
  boardBacklogLabel: string;
  boardActiveLabel: string;
  boardDoneLabel: string;
  boardColumns: string;
  language: string;
  showIconsOnHover: 0 | 1;
  fontSize: number;
  widgetShowInOverlay: 0 | 1;
}

export interface UserRow {
  id: string;
  username: string;
  totalXp: number;
  level: number;
  completedQuests: number;
  dailyCompletedTasks: number;
  dailyCompletedQuests: number;
  dailyEarnedXp: number;
  lastActiveDate: string | null;
  createdDate: string;
  updatedDate: string;
}

export interface AchievementRow {
  id: string;
  name: string;
  description: string;
  xpReward: number;
  unlocked: 0 | 1;
  unlockedDate: string | null;
}
