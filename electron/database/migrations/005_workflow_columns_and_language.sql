ALTER TABLE quests ADD COLUMN boardColumnId TEXT NOT NULL DEFAULT 'active';
ALTER TABLE quests ADD COLUMN boardOrder INTEGER NOT NULL DEFAULT 0;
ALTER TABLE settings ADD COLUMN boardColumns TEXT NOT NULL DEFAULT '[{"id":"backlog","title":"Görevler","status":"Archived"},{"id":"active","title":"Aktif Görevler","status":"Active"},{"id":"completed","title":"Tamamlanan Görevler","status":"Completed"}]';
ALTER TABLE settings ADD COLUMN language TEXT NOT NULL DEFAULT 'tr';

UPDATE quests
SET boardColumnId = CASE status
  WHEN 'Archived' THEN 'backlog'
  WHEN 'Completed' THEN 'completed'
  ELSE 'active'
END;

UPDATE settings
SET boardColumns = json_array(
  json_object('id', 'backlog', 'title', boardBacklogLabel, 'status', 'Archived'),
  json_object('id', 'active', 'title', boardActiveLabel, 'status', 'Active'),
  json_object('id', 'completed', 'title', boardDoneLabel, 'status', 'Completed')
)
WHERE id = 1;
