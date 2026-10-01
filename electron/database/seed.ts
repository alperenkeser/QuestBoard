import type Database from "better-sqlite3";

interface SeedQuest {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  xpReward: number;
  priority: string;
  category: string;
  status: string;
  dueDate: string | null;
  showInOverlay: boolean;
  subtasks: { id: string; title: string; completed: boolean }[];
}

// Mirrors the Phase 2/3 mock data so the first-run experience is identical
// whether or not SQLite is wired up yet.
const DEMO_QUESTS: SeedQuest[] = [
  {
    id: "q1",
    title: "Sprint Release",
    description: "Ship the v1 sprint to production.",
    difficulty: "Epic",
    xpReward: 1000,
    priority: "Critical",
    category: "Work",
    status: "Active",
    dueDate: null,
    showInOverlay: true,
    subtasks: [
      { id: "s1", title: "API Analysis", completed: false },
      { id: "s2", title: "Oracle Check", completed: true },
      { id: "s3", title: "Deployment", completed: false },
      { id: "s4", title: "Documentation", completed: false },
    ],
  },
  {
    id: "q2",
    title: "Refactor Auth Module",
    description: "Clean up the authentication flow.",
    difficulty: "Hard",
    xpReward: 500,
    priority: "High",
    category: "Work",
    status: "Active",
    dueDate: null,
    showInOverlay: true,
    subtasks: [
      { id: "s5", title: "Extract token service", completed: true },
      { id: "s6", title: "Add refresh flow", completed: false },
    ],
  },
  {
    id: "q3",
    title: "Write Weekly Report",
    description: "Summarize progress for stakeholders.",
    difficulty: "Easy",
    xpReward: 100,
    priority: "Medium",
    category: "Admin",
    status: "Active",
    dueDate: null,
    showInOverlay: true,
    subtasks: [
      { id: "s7", title: "Collect metrics", completed: false },
      { id: "s8", title: "Draft summary", completed: false },
    ],
  },
  {
    id: "q4",
    title: "Research New Icons",
    description: "Low priority, should not show in the capped overlay.",
    difficulty: "VeryEasy",
    xpReward: 50,
    priority: "Low",
    category: "Design",
    status: "Active",
    dueDate: null,
    showInOverlay: false,
    subtasks: [{ id: "s9", title: "Shortlist icon packs", completed: false }],
  },
  {
    id: "q5",
    title: "Migrate CI Pipeline",
    description: "Move build pipeline to the new runners.",
    difficulty: "Medium",
    xpReward: 250,
    priority: "High",
    category: "DevOps",
    status: "Completed",
    dueDate: null,
    showInOverlay: false,
    subtasks: [
      { id: "s10", title: "Update runner config", completed: true },
      { id: "s11", title: "Verify pipeline", completed: true },
    ],
  },
  {
    id: "q6",
    title: "Old Prototype Cleanup",
    description: "Archive leftover prototype code.",
    difficulty: "Easy",
    xpReward: 100,
    priority: "Low",
    category: "Work",
    status: "Archived",
    dueDate: null,
    showInOverlay: false,
    subtasks: [
      { id: "s12", title: "Delete unused branches", completed: true },
      { id: "s13", title: "Archive assets", completed: false },
    ],
  },
];

const DEMO_ACHIEVEMENTS = [
  { id: "a1", name: "First Blood", description: "Complete your first quest.", xpReward: 50 },
  { id: "a2", name: "Centurion", description: "Reach level 5.", xpReward: 200 },
  { id: "a3", name: "Legendary Slayer", description: "Complete a Legendary difficulty quest.", xpReward: 500 },
];

/** Inserts demo quests, subtasks, and achievements. Only called on a brand new database. */
export function seedDemoData(db: Database.Database): void {
  const timestamp = new Date().toISOString();

  const insertQuest = db.prepare(
    `INSERT INTO quests (id, title, description, difficulty, xpReward, priority, category, status, createdDate, updatedDate, dueDate, showInOverlay)
     VALUES (@id, @title, @description, @difficulty, @xpReward, @priority, @category, @status, @createdDate, @updatedDate, @dueDate, @showInOverlay)`
  );
  const insertSubtask = db.prepare(
    `INSERT INTO subtasks (id, questId, title, completed, orderIndex) VALUES (@id, @questId, @title, @completed, @orderIndex)`
  );
  const insertAchievement = db.prepare(
    `INSERT INTO achievements (id, name, description, xpReward, unlocked, unlockedDate) VALUES (@id, @name, @description, @xpReward, 0, NULL)`
  );

  const seedTransaction = db.transaction(() => {
    for (const quest of DEMO_QUESTS) {
      insertQuest.run({
        id: quest.id,
        title: quest.title,
        description: quest.description,
        difficulty: quest.difficulty,
        xpReward: quest.xpReward,
        priority: quest.priority,
        category: quest.category,
        status: quest.status,
        createdDate: timestamp,
        updatedDate: timestamp,
        dueDate: quest.dueDate,
        showInOverlay: quest.showInOverlay ? 1 : 0,
      });
      quest.subtasks.forEach((subtask, index) => {
        insertSubtask.run({
          id: subtask.id,
          questId: quest.id,
          title: subtask.title,
          completed: subtask.completed ? 1 : 0,
          orderIndex: index,
        });
      });
    }

    for (const achievement of DEMO_ACHIEVEMENTS) {
      insertAchievement.run(achievement);
    }
  });

  seedTransaction();
}
