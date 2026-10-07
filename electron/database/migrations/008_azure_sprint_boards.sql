CREATE TABLE azure_sprint_boards (
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

ALTER TABLE quests ADD COLUMN azureSprintBoardId TEXT
  REFERENCES azure_sprint_boards (id) ON DELETE SET NULL;
ALTER TABLE quests ADD COLUMN azureSourceKey TEXT;
ALTER TABLE quests ADD COLUMN azureWorkItemId TEXT;

CREATE INDEX idx_azure_sprint_boards_source ON azure_sprint_boards (sourceKey, timeFrame);
CREATE INDEX idx_quests_azure_sprint_board ON quests (azureSprintBoardId);
CREATE UNIQUE INDEX idx_quests_azure_work_item
  ON quests (azureSourceKey, azureWorkItemId)
  WHERE azureSourceKey IS NOT NULL AND azureWorkItemId IS NOT NULL;
