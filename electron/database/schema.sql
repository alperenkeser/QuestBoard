-- QuestBoard canonical schema (reference snapshot).
-- The database is actually built by applying the numbered files in
-- migrations/ in order; this file mirrors their combined result and should
-- be kept in sync whenever a new migration is added, so anyone can read the
-- current schema without replaying every migration by hand.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL DEFAULT 'Player',
  totalXp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  completedQuests INTEGER NOT NULL DEFAULT 0,
  dailyCompletedTasks INTEGER NOT NULL DEFAULT 0,
  dailyCompletedQuests INTEGER NOT NULL DEFAULT 0,
  dailyEarnedXp INTEGER NOT NULL DEFAULT 0,
  lastActiveDate TEXT,
  createdDate TEXT NOT NULL,
  updatedDate TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS azure_sprint_boards (
  id TEXT PRIMARY KEY,
  sourceKey TEXT NOT NULL,
  remoteId TEXT NOT NULL,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  startDate TEXT,
  finishDate TEXT,
  timeFrame TEXT NOT NULL DEFAULT 'unknown',
  lastSyncedDate TEXT,
  createdDate TEXT NOT NULL,
  updatedDate TEXT NOT NULL,
  UNIQUE (sourceKey, remoteId)
);

CREATE TABLE IF NOT EXISTS quests (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  difficulty TEXT NOT NULL,
  xpReward INTEGER NOT NULL,
  priority TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  status TEXT NOT NULL DEFAULT 'Active',
  createdDate TEXT NOT NULL,
  updatedDate TEXT NOT NULL,
  dueDate TEXT,
  showInOverlay INTEGER NOT NULL DEFAULT 0,
  boardColumnId TEXT NOT NULL DEFAULT 'active',
  boardOrder INTEGER NOT NULL DEFAULT 0,
  azureSprintBoardId TEXT REFERENCES azure_sprint_boards (id) ON DELETE SET NULL,
  azureSourceKey TEXT,
  azureWorkItemId TEXT
);

CREATE INDEX IF NOT EXISTS idx_quests_status ON quests (status);
CREATE INDEX IF NOT EXISTS idx_azure_sprint_boards_source
  ON azure_sprint_boards (sourceKey, timeFrame);
CREATE INDEX IF NOT EXISTS idx_quests_azure_sprint_board ON quests (azureSprintBoardId);
CREATE UNIQUE INDEX IF NOT EXISTS idx_quests_azure_work_item
  ON quests (azureSourceKey, azureWorkItemId)
  WHERE azureSourceKey IS NOT NULL AND azureWorkItemId IS NOT NULL;

CREATE TABLE IF NOT EXISTS subtasks (
  id TEXT PRIMARY KEY,
  questId TEXT NOT NULL REFERENCES quests (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  orderIndex INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_subtasks_questId ON subtasks (questId);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  transparency REAL NOT NULL DEFAULT 0.08,
  blurAmount INTEGER NOT NULL DEFAULT 20,
  theme TEXT NOT NULL DEFAULT 'dark',
  alwaysOnTop INTEGER NOT NULL DEFAULT 1,
  launchOnStartup INTEGER NOT NULL DEFAULT 0,
  shortcut TEXT NOT NULL DEFAULT 'CTRL+ALT+Q',
  overlayAnchor TEXT NOT NULL DEFAULT 'right-top',
  overlayX INTEGER,
  overlayY INTEGER,
  boardBacklogLabel TEXT NOT NULL DEFAULT 'Görevler',
  boardActiveLabel TEXT NOT NULL DEFAULT 'Aktif Görevler',
  boardDoneLabel TEXT NOT NULL DEFAULT 'Tamamlanan Görevler',
  boardColumns TEXT NOT NULL DEFAULT '[{"id":"backlog","title":"Görevler","status":"Archived"},{"id":"active","title":"Aktif Görevler","status":"Active"},{"id":"completed","title":"Tamamlanan Görevler","status":"Completed"}]',
  language TEXT NOT NULL DEFAULT 'tr',
  showIconsOnHover INTEGER NOT NULL DEFAULT 1,
  fontSize INTEGER NOT NULL DEFAULT 14,
  widgetShowInOverlay INTEGER NOT NULL DEFAULT 1,
  clickThroughShortcut TEXT NOT NULL DEFAULT 'CTRL+ALT+P',
  overlayIdleDimMinutes INTEGER NOT NULL DEFAULT 5
);

CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  xpReward INTEGER NOT NULL DEFAULT 0,
  unlocked INTEGER NOT NULL DEFAULT 0,
  unlockedDate TEXT
);
