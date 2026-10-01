ALTER TABLE quests ADD COLUMN showInOverlay INTEGER NOT NULL DEFAULT 0;
ALTER TABLE settings ADD COLUMN boardBacklogLabel TEXT NOT NULL DEFAULT 'Görevler';
ALTER TABLE settings ADD COLUMN boardActiveLabel TEXT NOT NULL DEFAULT 'Aktif Görevler';
ALTER TABLE settings ADD COLUMN boardDoneLabel TEXT NOT NULL DEFAULT 'Tamamlanan Görevler';
