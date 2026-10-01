import { app, BrowserWindow, globalShortcut, ipcMain, screen } from "electron";
import path from "node:path";
import { initDatabase } from "./database/sqlite";
import { registerIpcHandlers } from "./ipc";
import { SettingsRepository } from "./repositories/SettingsRepository";
import { assertTrustedIpcSender, secureRendererNavigation } from "./security";
import type { SettingsRow } from "./database/rowTypes";

// Set by the electron:dev script; when absent we always load the built renderer
// (both for `npm start` and for packaged production builds).
const devServerUrl = process.env.VITE_DEV_SERVER_URL;

const OVERLAY_WIDTH = 340;
const OVERLAY_HEIGHT = 760;
const OVERLAY_MARGIN = 16;

let overlayWindow: BrowserWindow | null = null;
let mainWindow: BrowserWindow | null = null;
let registeredShortcut: string | null = null;
let overlayContentHeight = OVERLAY_HEIGHT;

function loadRenderer(win: BrowserWindow, query?: Record<string, string>): void {
  if (devServerUrl) {
    const url = new URL(devServerUrl);
    for (const [key, value] of Object.entries(query ?? {})) {
      url.searchParams.set(key, value);
    }
    win.loadURL(url.toString());
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"), { query });
  }
}

function createMainWindow(): void {
  // This is the Quest Manager window: a normal, resizable, non-transparent
  // window kept separate from the always-on-top overlay HUD.
  mainWindow = new BrowserWindow({
    title: "QuestBoard — Quest Manager",
    width: 1000,
    height: 760,
    minWidth: 720,
    minHeight: 480,
    backgroundColor: "#0e0e12",
    icon: path.join(__dirname, "assets", "questboard-icon.png"),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  secureRendererNavigation(mainWindow);
  loadRenderer(mainWindow);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  if (devServerUrl) mainWindow.webContents.openDevTools({ mode: "detach" });
}

function focusMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) createMainWindow();
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function focusOverlayWindow(): void {
  if (!overlayWindow) {
    createOverlayWindow(SettingsRepository.get());
    return;
  }
  overlayWindow.show();
  overlayWindow.focus();
}

function moveOverlayWindow(x: number, y: number): void {
  if (!overlayWindow) return;
  overlayWindow.setPosition(Math.round(x), Math.round(y));
}

function resolveOverlayPosition(
  settings: SettingsRow,
  requestedHeight = OVERLAY_HEIGHT
): { x: number; y: number; height: number } {
  const { workArea } = screen.getPrimaryDisplay();
  const height = Math.min(requestedHeight, workArea.height - OVERLAY_MARGIN * 2);

  if (settings.overlayAnchor === "custom" && settings.overlayX !== null && settings.overlayY !== null) {
    return { x: settings.overlayX, y: settings.overlayY, height };
  }

  const isLeft = settings.overlayAnchor.startsWith("left");
  const x = isLeft
    ? workArea.x + OVERLAY_MARGIN
    : workArea.x + workArea.width - OVERLAY_WIDTH - OVERLAY_MARGIN;

  const yByAnchor: Record<string, number> = {
    "left-top": workArea.y + OVERLAY_MARGIN,
    "right-top": workArea.y + OVERLAY_MARGIN,
    "left-middle": workArea.y + Math.round((workArea.height - height) / 2),
    "right-middle": workArea.y + Math.round((workArea.height - height) / 2),
    "left-bottom": workArea.y + workArea.height - height - OVERLAY_MARGIN,
    "right-bottom": workArea.y + workArea.height - height - OVERLAY_MARGIN,
  };

  return { x, y: yByAnchor[settings.overlayAnchor] ?? workArea.y + OVERLAY_MARGIN, height };
}

function resizeOverlayToContent(requestedHeight: number): void {
  if (!overlayWindow || !Number.isFinite(requestedHeight)) return;
  const { workArea } = screen.getPrimaryDisplay();
  const maxHeight = Math.max(120, workArea.height - OVERLAY_MARGIN * 2);
  const height = Math.min(Math.max(120, Math.ceil(requestedHeight)), maxHeight);
  overlayContentHeight = height;
  const nextPos = resolveOverlayPosition(SettingsRepository.get(), height);
  overlayWindow.setBounds({
    x: nextPos.x,
    y: nextPos.y,
    width: OVERLAY_WIDTH,
    height: nextPos.height,
  });
}

function applyRuntimeSettings(settings: SettingsRow): void {
  if (overlayWindow) {
    const nextPos = resolveOverlayPosition(settings, overlayContentHeight);
    overlayWindow.setBounds({ x: nextPos.x, y: nextPos.y, width: OVERLAY_WIDTH, height: nextPos.height });
    overlayWindow.setAlwaysOnTop(Boolean(settings.alwaysOnTop), "screen-saver");
    overlayWindow.setVisibleOnAllWorkspaces(Boolean(settings.alwaysOnTop), {
      visibleOnFullScreen: Boolean(settings.alwaysOnTop),
    });
  }

  try {
    app.setLoginItemSettings({ openAtLogin: Boolean(settings.launchOnStartup) });
  } catch (error) {
    console.error("Failed to apply launchOnStartup setting:", error);
  }

  if (!app.isReady()) return;
  if (registeredShortcut) {
    globalShortcut.unregister(registeredShortcut);
    registeredShortcut = null;
  }

  const shortcut = settings.shortcut.trim() || "CTRL+ALT+Q";
  try {
    const registered = globalShortcut.register(shortcut, () => {
      if (!mainWindow) return;
      if (mainWindow.isVisible() && mainWindow.isFocused()) {
        mainWindow.minimize();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    });
    if (registered) {
      registeredShortcut = shortcut;
    } else {
      console.error(`Failed to register shortcut: ${shortcut}`);
    }
  } catch (error) {
    console.error("Invalid global shortcut:", shortcut, error);
  }
}

function createOverlayWindow(settings: SettingsRow): void {
  const { x, y, height } = resolveOverlayPosition(settings);

  overlayWindow = new BrowserWindow({
    x,
    y,
    width: OVERLAY_WIDTH,
    height,
    minWidth: OVERLAY_WIDTH,
    minHeight: 120,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    alwaysOnTop: Boolean(settings.alwaysOnTop),
    skipTaskbar: true,
    fullscreenable: false,
    backgroundColor: "#00000000",
    icon: path.join(__dirname, "assets", "questboard-icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  overlayWindow.setAlwaysOnTop(Boolean(settings.alwaysOnTop), "screen-saver");
  overlayWindow.setVisibleOnAllWorkspaces(Boolean(settings.alwaysOnTop), {
    visibleOnFullScreen: Boolean(settings.alwaysOnTop),
  });
  overlayWindow.setIgnoreMouseEvents(false);

  secureRendererNavigation(overlayWindow);
  loadRenderer(overlayWindow, { window: "overlay" });

  overlayWindow.on("closed", () => {
    overlayWindow = null;
  });
}

app.whenReady().then(() => {
  try {
    initDatabase();
    const settings = SettingsRepository.get();
    ipcMain.handle("window:setOverlayContentHeight", (event, height: number) => {
      assertTrustedIpcSender(event);
      resizeOverlayToContent(height);
    });
    registerIpcHandlers({
      onSettingsUpdated: applyRuntimeSettings,
      focusMainWindow,
      focusOverlayWindow,
      moveOverlayWindow,
    });
    applyRuntimeSettings(settings);
    createMainWindow();
    createOverlayWindow(settings);
  } catch (err) {
    console.error("Failed to initialize database / IPC:", err);
    throw err;
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const settings = SettingsRepository.get();
      createMainWindow();
      createOverlayWindow(settings);
    }
  });
}).catch((err) => {
  console.error("Fatal startup error:", err);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  if (registeredShortcut) {
    globalShortcut.unregister(registeredShortcut);
  }
  globalShortcut.unregisterAll();
});
