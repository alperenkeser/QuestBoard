const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const Module = require("node:module");
const { test } = require("node:test");

const userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), "questboard-azure-test-"));
const electronMock = {
  app: { getPath: () => userDataPath },
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (value) => Buffer.from(value, "utf8"),
    decryptString: (value) => value.toString("utf8"),
  },
};
const originalModuleLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "electron") return electronMock;
  return originalModuleLoad.call(this, request, parent, isMain);
};

const { initDatabase, getDb } = require("../dist-electron/database/sqlite.js");
const { AzureSprintBoardRepository } = require("../dist-electron/repositories/AzureSprintBoardRepository.js");
const { SubtaskRepository } = require("../dist-electron/repositories/SubtaskRepository.js");
const { UserRepository } = require("../dist-electron/repositories/UserRepository.js");
const {
  importAzureDevOpsTasks,
  previewAzureDevOpsSprint,
  testAzureDevOpsConnection,
} = require("../dist-electron/azureDevOps.js");

test("Azure task preview and selective import preserve sprint isolation and local progress data", async (context) => {
  context.after(() => {
    try {
      getDb().close();
    } finally {
      Module._load = originalModuleLoad;
      fs.rmSync(userDataPath, { recursive: true, force: true });
    }
  });

  initDatabase();
  const connection = {
    sprintUrl:
      "https://azure.example.invalid/Project/_apis/work/teamsettings/iterations?$timeframe=current",
    wiqlUrl: "https://azure.example.invalid/Project/_apis/wit/wiql",
    workItemsBatchUrl: "https://azure.example.invalid/Project/_apis/wit/workitemsbatch",
    username: "mock-user",
    password: "mock-pat-for-tests",
  };
  const sprints = [
    {
      id: 17,
      name: "Sprint Current",
      path: "Project\\Sprint Current",
      attributes: {
        timeFrame: "current",
        startDate: "2030-01-01T00:00:00Z",
        finishDate: "2030-01-14T00:00:00Z",
      },
    },
    {
      id: 18,
      name: "Sprint Future",
      path: "Project\\Sprint Future",
      attributes: {
        timeFrame: "future",
        startDate: "2030-01-15T00:00:00Z",
        finishDate: "2030-01-28T00:00:00Z",
      },
    },
  ];
  let currentTitle = "Current Azure task";
  const wiqlQueries = [];
  globalThis.fetch = async (input, init) => {
    const url = new URL(input.toString());
    if (url.pathname.endsWith("/iterations")) {
      assert.equal(url.searchParams.has("$timeframe"), false);
      return new Response(JSON.stringify({ value: sprints }), { status: 200 });
    }
    if (url.pathname.endsWith("/wiql")) {
      const { query } = JSON.parse(init.body);
      wiqlQueries.push(query);
      const isFutureSprint = query.includes("Sprint Future");
      return new Response(
        JSON.stringify({ workItems: [{ id: isFutureSprint ? 202 : 101 }] }),
        { status: 200 }
      );
    }
    if (url.pathname.endsWith("/workitemsbatch")) {
      const { ids } = JSON.parse(init.body);
      const future = ids.includes(202);
      return new Response(
        JSON.stringify({
          value: [
            {
              id: future ? 202 : 101,
              url: `https://azure.example.invalid/Project/_apis/wit/workItems/${future ? 202 : 101}`,
              fields: {
                "System.Id": future ? 202 : 101,
                "System.Title": future ? "Future Azure task" : currentTitle,
                "System.State": future ? "Done" : "Active",
                "System.AssignedTo": { displayName: "Mock User" },
                "System.IterationPath": future
                  ? "Project\\Sprint Future"
                  : "Project\\Sprint Current",
                "System.Description": future ? "Future task description" : "Updated description",
              },
            },
          ],
        }),
        { status: 200 }
      );
    }
    throw new Error(`Unexpected mock API request: ${url.pathname}`);
  };

  const tested = await testAzureDevOpsConnection(connection);
  assert.equal(tested.activeSprintId, "17");
  assert.deepEqual(tested.sprints.map((sprint) => sprint.id), ["17", "18"]);

  const savedProfile = { ...connection, password: "" };
  const userBefore = UserRepository.get();
  const currentPreview = await previewAzureDevOpsSprint(savedProfile, tested.activeSprintId);
  assert.equal(currentPreview.tasks.length, 1);
  assert.equal(currentPreview.tasks[0].id, 101);
  assert.equal(AzureSprintBoardRepository.getAll().length, 0, "preview must not import tasks");
  const firstSync = importAzureDevOpsTasks(currentPreview.previewId, [101]);
  const currentBoard = firstSync.board;
  assert.equal(wiqlQueries.at(-1).includes("[System.AssignedTo] = @Me"), true);
  assert.equal(
    wiqlQueries.at(-1).includes("[System.IterationPath] = 'Project\\Sprint Current'"),
    true
  );

  let currentQuests = AzureSprintBoardRepository.getQuestsForBoard(currentBoard.id).quests;
  assert.equal(currentQuests.length, 1);
  const importedQuest = currentQuests[0];
  assert.equal(importedQuest.azureWorkItemId, "101");
  assert.equal(importedQuest.azureSprintBoardId, currentBoard.id);
  assert.equal(importedQuest.dueDate, sprints[0].attributes.finishDate);
  assert.equal(importedQuest.status, "Active");
  SubtaskRepository.create({
    id: "local-subtask-test",
    questId: importedQuest.id,
    title: "User-created subtask",
    orderIndex: 0,
  });
  getDb()
    .prepare(
      "UPDATE quests SET difficulty='Epic', xpReward=2000, priority='Critical', category='Local category' WHERE id=?"
    )
    .run(importedQuest.id);

  currentTitle = "Renamed in Azure";
  const refreshedPreview = await previewAzureDevOpsSprint(savedProfile, tested.activeSprintId);
  importAzureDevOpsTasks(refreshedPreview.previewId, [101]);
  currentQuests = AzureSprintBoardRepository.getQuestsForBoard(currentBoard.id).quests;
  assert.equal(currentQuests.length, 1);
  assert.equal(currentQuests[0].title, "Renamed in Azure");
  assert.equal(currentQuests[0].difficulty, "Epic");
  assert.equal(currentQuests[0].xpReward, 2000);
  assert.equal(currentQuests[0].priority, "Critical");
  assert.equal(currentQuests[0].category, "Local category");
  assert.equal(SubtaskRepository.getByQuestId(importedQuest.id)[0].title, "User-created subtask");

  const futurePreview = await previewAzureDevOpsSprint(savedProfile, "18");
  assert.equal(futurePreview.tasks[0].id, 202);
  const futureSync = importAzureDevOpsTasks(futurePreview.previewId, [202]);
  assert.equal(futureSync.board.id === currentBoard.id, false);
  const futureQuests = AzureSprintBoardRepository.getQuestsForBoard(futureSync.board.id).quests;
  assert.equal(futureQuests.length, 1);
  assert.equal(futureQuests[0].status, "Completed");
  assert.equal(
    AzureSprintBoardRepository.getQuestsForBoard(currentBoard.id).quests[0].azureSprintBoardId,
    currentBoard.id
  );
  const repeatedFuturePreview = await previewAzureDevOpsSprint(savedProfile, "18");
  importAzureDevOpsTasks(repeatedFuturePreview.previewId, [202]);
  assert.equal(AzureSprintBoardRepository.getQuestsForBoard(futureSync.board.id).quests.length, 1);
  const userAfter = UserRepository.get();
  for (const field of [
    "totalXp",
    "level",
    "completedQuests",
    "dailyCompletedTasks",
    "dailyCompletedQuests",
    "dailyEarnedXp",
  ]) {
    assert.equal(userAfter[field], userBefore[field], `sync changed user field ${field}`);
  }
});
