import { contextBridge, ipcRenderer } from "electron";

// Bridge for renderer <-> main IPC. The renderer's service layer (src/services)
// calls these functions; it never touches SQLite directly. Repositories and
// the actual database connection live in the main process (electron/).
contextBridge.exposeInMainWorld("questboard", {
  version: process.versions.electron,
  db: {
    quests: {
      getAllWithSubtasks: () => ipcRenderer.invoke("quests:getAllWithSubtasks"),
      create: (input: unknown) => ipcRenderer.invoke("quests:create", input),
      update: (id: string, input: unknown) => ipcRenderer.invoke("quests:update", id, input),
      delete: (id: string) => ipcRenderer.invoke("quests:delete", id),
      setStatus: (id: string, status: string) => ipcRenderer.invoke("quests:setStatus", id, status),
      setBoardColumn: (id: string, columnId: string) =>
        ipcRenderer.invoke("quests:setBoardColumn", id, columnId),
      setOverlayPinned: (id: string, pinned: boolean) =>
        ipcRenderer.invoke("quests:setOverlayPinned", id, pinned),
    },
    subtasks: {
      toggle: (id: string) => ipcRenderer.invoke("subtasks:toggle", id),
      add: (questId: string, title: string, orderIndex: number) =>
        ipcRenderer.invoke("subtasks:add", questId, title, orderIndex),
      remove: (id: string) => ipcRenderer.invoke("subtasks:remove", id),
      reorder: (questId: string, orderedIds: string[]) =>
        ipcRenderer.invoke("subtasks:reorder", questId, orderedIds),
    },
    settings: {
      get: () => ipcRenderer.invoke("settings:get"),
      update: (input: unknown) => ipcRenderer.invoke("settings:update", input),
    },
    user: {
      get: () => ipcRenderer.invoke("user:get"),
      addXp: (amount: number) => ipcRenderer.invoke("user:addXp", amount),
      incrementCompletedQuests: () => ipcRenderer.invoke("user:incrementCompletedQuests"),
      incrementDailyCompletedTasks: () => ipcRenderer.invoke("user:incrementDailyCompletedTasks"),
    },
    azureDevOps: {
      getConnection: () => ipcRenderer.invoke("azureDevOps:getConnection"),
      testConnection: (input: unknown) => ipcRenderer.invoke("azureDevOps:testConnection", input),
      synchronize: (input: unknown) => ipcRenderer.invoke("azureDevOps:synchronize", input),
      disconnect: () => ipcRenderer.invoke("azureDevOps:disconnect"),
    },
  },
  window: {
    minimizeSelf: () => ipcRenderer.invoke("window:minimizeSelf"),
    closeSelf: () => ipcRenderer.invoke("window:closeSelf"),
    setMousePassthrough: (enabled: boolean) =>
      ipcRenderer.invoke("window:setMousePassthrough", enabled),
    focusMain: () => ipcRenderer.invoke("window:focusMain"),
    focusOverlay: () => ipcRenderer.invoke("window:focusOverlay"),
    setOverlayPosition: (x: number, y: number) =>
      ipcRenderer.invoke("window:setOverlayPosition", x, y),
    getOverlayClickThrough: () => ipcRenderer.invoke("window:getOverlayClickThrough"),
    setOverlayClickThrough: (enabled: boolean) =>
      ipcRenderer.invoke("window:setOverlayClickThrough", enabled),
    setOverlayContentHeight: (height: number) =>
      ipcRenderer.invoke("window:setOverlayContentHeight", height),
    onOverlayClickThroughChanged: (callback: (enabled: boolean) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, enabled: boolean) => callback(enabled);
      ipcRenderer.on("window:overlayClickThroughChanged", listener);
      return () => ipcRenderer.removeListener("window:overlayClickThroughChanged", listener);
    },
  },
  onDbChanged: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on("db:changed", listener);
    return () => ipcRenderer.removeListener("db:changed", listener);
  },
  onOverlayPinChanged: (callback: (questId: string, pinned: boolean) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, questId: string, pinned: boolean) =>
      callback(questId, pinned);
    ipcRenderer.on("quests:overlayPinChanged", listener);
    return () => ipcRenderer.removeListener("quests:overlayPinChanged", listener);
  },
});
