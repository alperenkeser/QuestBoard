// Ambient typing for the bridge exposed by electron/preload.ts via contextBridge.
// These shapes mirror the raw SQLite row types (electron/database/rowTypes.ts),
// not the renderer's domain types — the services layer (src/services) is
// responsible for translating between the two.

export interface QuestRowDto {
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

export interface SubtaskRowDto {
  id: string;
  questId: string;
  title: string;
  completed: 0 | 1;
  orderIndex: number;
}

export interface SettingsRowDto {
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
}

export interface UserRowDto {
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

export interface QuestFormPayloadDto {
  title: string;
  description: string;
  priority: string;
  difficulty: string;
  xpReward: number;
  category: string;
  dueDate: string | null;
  subtaskTitles: string[];
  boardColumnId: string;
  status: string;
}

export interface QuestBoardBridge {
  version: string;
  db: {
    quests: {
      getAllWithSubtasks: () => Promise<{ quests: QuestRowDto[]; subtasks: SubtaskRowDto[] }>;
      create: (input: QuestFormPayloadDto) => Promise<string>;
      update: (id: string, input: QuestFormPayloadDto) => Promise<void>;
      delete: (id: string) => Promise<void>;
      setStatus: (id: string, status: string) => Promise<void>;
      setBoardColumn: (id: string, columnId: string) => Promise<void>;
      setOverlayPinned: (id: string, pinned: boolean) => Promise<void>;
    };
    subtasks: {
      toggle: (id: string) => Promise<SubtaskRowDto>;
      add: (questId: string, title: string, orderIndex: number) => Promise<string>;
      remove: (id: string) => Promise<void>;
      reorder: (questId: string, orderedIds: string[]) => Promise<void>;
    };
    settings: {
      get: () => Promise<SettingsRowDto>;
      update: (input: Partial<SettingsRowDto>) => Promise<SettingsRowDto>;
    };
    user: {
      get: () => Promise<UserRowDto>;
      addXp: (amount: number) => Promise<UserRowDto>;
      incrementCompletedQuests: () => Promise<UserRowDto>;
      incrementDailyCompletedTasks: () => Promise<UserRowDto>;
    };
  };
  window: {
    minimizeSelf: () => Promise<void>;
    closeSelf: () => Promise<void>;
    setMousePassthrough: (enabled: boolean) => Promise<void>;
    focusMain: () => Promise<void>;
    focusOverlay: () => Promise<void>;
    setOverlayPosition: (x: number, y: number) => Promise<void>;
    setOverlayContentHeight: (height: number) => Promise<void>;
  };
  onDbChanged: (callback: () => void) => () => void;
  onOverlayPinChanged: (callback: (questId: string, pinned: boolean) => void) => () => void;
}

declare global {
  interface Window {
    questboard: QuestBoardBridge;
  }
}

export {};
