import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { app } from "electron";
import { seedDemoData } from "./seed";

let db: Database.Database | null = null;

function getDbPath(): string {
  return path.join(app.getPath("userData"), "questboard.db");
}

function getMigrationsDir(): string {
  return path.join(__dirname, "migrations");
}

/** Applies any migrations/*.sql files not yet recorded in `_migrations`, in filename order. */
function runMigrations(database: Database.Database): void {
  database.exec(
    `CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      appliedDate TEXT NOT NULL
    )`
  );

  const applied = new Set(
    database.prepare("SELECT name FROM _migrations").all().map((row) => (row as { name: string }).name)
  );

  const migrationsDir = getMigrationsDir();
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const insertMigration = database.prepare(
    "INSERT INTO _migrations (name, appliedDate) VALUES (?, ?)"
  );

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    const applyMigration = database.transaction(() => {
      database.exec(sql);
      insertMigration.run(file, new Date().toISOString());
    });
    applyMigration();
  }
}

/**
 * Ensures the singleton settings row and the local user profile exist.
 * Demo quests/subtasks/achievements are only seeded the very first time the
 * user row is created, so deleting all quests later never resurrects them.
 */
function ensureDefaultRows(database: Database.Database): void {
  database.exec(
    `INSERT OR IGNORE INTO settings (id) VALUES (1)`
  );

  const hasUser = database.prepare("SELECT 1 FROM users LIMIT 1").get();
  if (!hasUser) {
    const timestamp = new Date().toISOString();
    database
      .prepare(
        `INSERT INTO users (id, username, totalXp, level, completedQuests, dailyCompletedTasks, createdDate, updatedDate)
         VALUES ('local-player', 'Player', 0, 1, 0, 0, ?, ?)`
      )
      .run(timestamp, timestamp);

    seedDemoData(database);
  }
}

/** Opens (creating if needed) the SQLite database, runs migrations, and ensures default rows exist. */
export function initDatabase(): Database.Database {
  const dbPath = getDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  runMigrations(db);
  ensureDefaultRows(db);

  return db;
}

export function getDb(): Database.Database {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
}
