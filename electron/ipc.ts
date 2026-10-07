import { ipcMain, BrowserWindow } from "electron";
import { QuestRepository } from "./repositories/QuestRepository";
import { SubtaskRepository } from "./repositories/SubtaskRepository";
import { SettingsRepository } from "./repositories/SettingsRepository";
import { UserRepository } from "./repositories/UserRepository";
import { generateId } from "./utils/id";
import { assertTrustedIpcSender } from "./security";
import type { SettingsRow } from "./database/rowTypes";
import {
  disconnectAzureDevOps,
  getAzureDevOpsConnection,
  synchronizeAzureDevOps,
  testAzureDevOpsConnection,
} from "./azureDevOps";

export interface QuestFormPayload {
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

interface RegisterIpcHandlersOptions {
  onSettingsUpdated?: (settings: SettingsRow) => void;
  focusMainWindow?: () => void;
  focusOverlayWindow?: () => void;
  moveOverlayWindow?: (x: number, y: number) => void;
}

/** Notifies every open window that persisted data changed, so each renderer can re-hydrate its store. */
function broadcastDbChanged(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send("db:changed");
  }
}

function broadcastOverlayPinChanged(questId: string, pinned: boolean): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send("quests:overlayPinChanged", questId, pinned);
  }
}

/**
 * Registers every ipcMain handler the renderer's service layer calls into.
 * This is the only place repositories are invoked from outside the main
 * process boundary — React/Zustand never reach SQLite directly.
 */
export function registerIpcHandlers(options: RegisterIpcHandlersOptions = {}): void {
  ipcMain.handle("window:minimizeSelf", (event) => {
    assertTrustedIpcSender(event);
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.minimize();
  });

  ipcMain.handle("window:closeSelf", (event) => {
    assertTrustedIpcSender(event);
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.close();
  });

  ipcMain.handle("window:setMousePassthrough", (event, enabled: boolean) => {
    assertTrustedIpcSender(event);
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    win.setIgnoreMouseEvents(Boolean(enabled), { forward: true });
  });

  ipcMain.handle("window:focusMain", (event) => {
    assertTrustedIpcSender(event);
    options.focusMainWindow?.();
  });

  ipcMain.handle("window:focusOverlay", (event) => {
    assertTrustedIpcSender(event);
    options.focusOverlayWindow?.();
  });

  ipcMain.handle("window:setOverlayPosition", (event, x: number, y: number) => {
    assertTrustedIpcSender(event);
    options.moveOverlayWindow?.(x, y);
  });

  ipcMain.handle("quests:getAllWithSubtasks", (event) => {
    assertTrustedIpcSender(event);
    return {
      quests: QuestRepository.getAll(),
      subtasks: SubtaskRepository.getAll(),
    };
  });

  ipcMain.handle("quests:create", (event, input: QuestFormPayload) => {
    assertTrustedIpcSender(event);
    const questId = generateId("quest");
    const timestamp = new Date().toISOString();
    const columns = SettingsRepository.getBoardColumns();
    const targetColumn = columns.find((column) => column.id === input.boardColumnId);
    if (!targetColumn) throw new Error("Cannot create quest in an unknown board column.");
    QuestRepository.create({
      id: questId,
      title: input.title,
      description: input.description,
      difficulty: input.difficulty,
      xpReward: input.xpReward,
      priority: input.priority,
      category: input.category,
      dueDate: input.dueDate,
      createdDate: timestamp,
      updatedDate: timestamp,
      showInOverlay: 0,
      boardColumnId: targetColumn.id,
      boardOrder: QuestRepository.getAll().filter((q) => q.boardColumnId === targetColumn.id).length,
      status: targetColumn.status,
    });
    input.subtaskTitles.forEach((title, index) => {
      SubtaskRepository.create({ id: generateId("subtask"), questId, title, orderIndex: index });
    });
    broadcastDbChanged();
    return questId;
  });

  ipcMain.handle("quests:update", (event, questId: string, input: QuestFormPayload) => {
    assertTrustedIpcSender(event);
    QuestRepository.update(questId, {
      title: input.title,
      description: input.description,
      difficulty: input.difficulty,
      xpReward: input.xpReward,
      priority: input.priority,
      category: input.category,
      dueDate: input.dueDate,
      updatedDate: new Date().toISOString(),
    });
    SubtaskRepository.replaceForQuest(questId, input.subtaskTitles, () => generateId("subtask"));
    broadcastDbChanged();
  });

  ipcMain.handle("quests:delete", (event, questId: string) => {
    assertTrustedIpcSender(event);
    QuestRepository.delete(questId);
    broadcastDbChanged();
  });

  ipcMain.handle("quests:setStatus", (event, questId: string, columnId: string) => {
    assertTrustedIpcSender(event);
    const columns = SettingsRepository.getBoardColumns();
    const targetColumn =
      columns.find((column) => column.id === columnId) ??
      columns.find((column) => column.status === columnId);
    if (!targetColumn) throw new Error("Cannot move quest to an unknown board column.");
    const order = QuestRepository.getAll().filter((quest) => quest.boardColumnId === columnId).length;
    QuestRepository.setBoardColumn(
      questId,
      targetColumn.id,
      targetColumn.status,
      order,
      new Date().toISOString()
    );
    broadcastDbChanged();
  });

  ipcMain.handle("quests:setBoardColumn", (event, questId: string, columnId: string) => {
    assertTrustedIpcSender(event);
    const targetColumn = SettingsRepository.getBoardColumns().find((column) => column.id === columnId);
    if (!targetColumn) throw new Error("Cannot move quest to an unknown board column.");
    const order = QuestRepository.getAll().filter((quest) => quest.boardColumnId === columnId).length;
    QuestRepository.setBoardColumn(
      questId,
      targetColumn.id,
      targetColumn.status,
      order,
      new Date().toISOString()
    );
    broadcastDbChanged();
  });

  ipcMain.handle("quests:setOverlayPinned", (event, questId: string, pinned: boolean) => {
    assertTrustedIpcSender(event);
    const nextPinned = Boolean(pinned);
    QuestRepository.setOverlayPinned(questId, nextPinned ? 1 : 0, new Date().toISOString());
    broadcastOverlayPinChanged(questId, nextPinned);
    broadcastDbChanged();
  });

  ipcMain.handle("subtasks:toggle", (event, subtaskId: string) => {
    assertTrustedIpcSender(event);
    const row = SubtaskRepository.toggle(subtaskId);
    broadcastDbChanged();
    return row;
  });

  ipcMain.handle("subtasks:add", (event, questId: string, title: string, orderIndex: number) => {
    assertTrustedIpcSender(event);
    const id = generateId("subtask");
    SubtaskRepository.create({ id, questId, title, orderIndex });
    broadcastDbChanged();
    return id;
  });

  ipcMain.handle("subtasks:remove", (event, subtaskId: string) => {
    assertTrustedIpcSender(event);
    SubtaskRepository.remove(subtaskId);
    broadcastDbChanged();
  });

  ipcMain.handle("subtasks:reorder", (event, questId: string, orderedIds: string[]) => {
    assertTrustedIpcSender(event);
    SubtaskRepository.reorder(questId, orderedIds);
    broadcastDbChanged();
  });

  ipcMain.handle("settings:get", (event) => {
    assertTrustedIpcSender(event);
    return SettingsRepository.get();
  });

  ipcMain.handle("settings:update", (event, input) => {
    assertTrustedIpcSender(event);
    const updated = SettingsRepository.update(input);
    options.onSettingsUpdated?.(updated);
    broadcastDbChanged();
    return updated;
  });

  ipcMain.handle("azureDevOps:getConnection", (event) => {
    assertTrustedIpcSender(event);
    return getAzureDevOpsConnection();
  });

  ipcMain.handle("azureDevOps:testConnection", (event, input: unknown) => {
    assertTrustedIpcSender(event);
    return testAzureDevOpsConnection(input);
  });

  ipcMain.handle("azureDevOps:synchronize", (event, input: unknown) => {
    assertTrustedIpcSender(event);
    return synchronizeAzureDevOps(input);
  });

  ipcMain.handle("azureDevOps:disconnect", (event) => {
    assertTrustedIpcSender(event);
    disconnectAzureDevOps();
  });

  ipcMain.handle("user:get", (event) => {
    assertTrustedIpcSender(event);
    return UserRepository.get();
  });

  ipcMain.handle("user:addXp", (event, amount: number) => {
    assertTrustedIpcSender(event);
    const user = UserRepository.addXp(amount);
    broadcastDbChanged();
    return user;
  });

  ipcMain.handle("user:incrementCompletedQuests", (event) => {
    assertTrustedIpcSender(event);
    const user = UserRepository.incrementCompletedQuests();
    broadcastDbChanged();
    return user;
  });

  ipcMain.handle("user:incrementDailyCompletedTasks", (event) => {
    assertTrustedIpcSender(event);
    const user = UserRepository.incrementDailyCompletedTasks();
    broadcastDbChanged();
    return user;
  });
}
