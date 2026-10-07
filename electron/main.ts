import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  screen,
  Tray,
} from "electron";
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
let tray: Tray | null = null;
let registeredShortcuts: string[] = [];
let overlayContentHeight = OVERLAY_HEIGHT;
let overlayClickThroughEnabled = false;
let isQuitting = false;

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
  mainWindow.on("minimize", () => {
    mainWindow?.hide();
  });
  mainWindow.on("close", (event) => {
    if (isQuitting) return;
    event.preventDefault();
    mainWindow?.hide();
  });
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

function createTray(): void {
  const iconPath = path.join(__dirname, "assets", "questboard-icon.png");
  tray = new Tray(nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 }));
  tray.setToolTip("QuestBoard");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "QuestBoard'ı Aç", click: focusMainWindow },
      { label: "Widget'ı Göster", click: focusOverlayWindow },
      { type: "separator" },
      {
        label: "Çıkış",
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ])
  );
  tray.on("click", focusMainWindow);
}

function setOverlayClickThrough(enabled: boolean): void {
  overlayClickThroughEnabled = enabled;
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.setIgnoreMouseEvents(enabled, { forward: true });
  }
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send("window:overlayClickThroughChanged", enabled);
  }
}

function moveOverlayWindow(x: number, y: number): void {
  if (!overlayWindow || !Number.isFinite(x) || !Number.isFinite(y)) return;
  const bounds = overlayWindow.getBounds();
  const display = screen.getDisplayNearestPoint({
    x: Math.round(x + bounds.width / 2),
    y: Math.round(y + bounds.height / 2),
  });
  const { workArea } = display;
  const nextX = Math.min(Math.max(Math.round(x), workArea.x), workArea.x + workArea.width - bounds.width);
  const nextY = Math.min(Math.max(Math.round(y), workArea.y), workArea.y + workArea.height - bounds.height);
  overlayWindow.setPosition(nextX, nextY);
}

function resolveOverlayPosition(
  settings: SettingsRow,
  requestedHeight = overlayWindow?.getBounds().height ?? OVERLAY_HEIGHT,
  requestedWidth = overlayWindow?.getBounds().width ?? OVERLAY_WIDTH
): { x: number; y: number; width: number; height: number } {
  const currentBounds = overlayWindow?.getBounds();
  const display = currentBounds
    ? screen.getDisplayMatching(currentBounds)
    : settings.overlayAnchor === "custom" && settings.overlayX !== null && settings.overlayY !== null
      ? screen.getDisplayNearestPoint({ x: settings.overlayX, y: settings.overlayY })
      : screen.getPrimaryDisplay();
  const { workArea } = display;
  const width = Math.min(requestedWidth, workArea.width - OVERLAY_MARGIN * 2);
  const height = Math.min(requestedHeight, workArea.height - OVERLAY_MARGIN * 2);

  if (settings.overlayAnchor === "custom" && settings.overlayX !== null && settings.overlayY !== null) {
    return {
      x: Math.min(Math.max(settings.overlayX, workArea.x), workArea.x + workArea.width - width),
      y: Math.min(Math.max(settings.overlayY, workArea.y), workArea.y + workArea.height - height),
      width,
      height,
    };
  }

  const isLeft = settings.overlayAnchor.startsWith("left");
  const x = isLeft
    ? workArea.x + OVERLAY_MARGIN
    : workArea.x + workArea.width - width - OVERLAY_MARGIN;

  const yByAnchor: Record<string, number> = {
    "left-top": workArea.y + OVERLAY_MARGIN,
    "right-top": workArea.y + OVERLAY_MARGIN,
    "left-middle": workArea.y + Math.round((workArea.height - height) / 2),
    "right-middle": workArea.y + Math.round((workArea.height - height) / 2),
    "left-bottom": workArea.y + workArea.height - height - OVERLAY_MARGIN,
    "right-bottom": workArea.y + workArea.height - height - OVERLAY_MARGIN,
  };

  return { x, y: yByAnchor[settings.overlayAnchor] ?? workArea.y + OVERLAY_MARGIN, width, height };
}

function setOverlayBounds(bounds: Electron.Rectangle): void {
  if (!overlayWindow) return;
  const currentBounds = overlayWindow.getBounds();
  if (currentBounds.width !== bounds.width || currentBounds.height !== bounds.height) {
    overlayWindow.setSize(bounds.width, bounds.height);
  }
  if (currentBounds.x !== bounds.x || currentBounds.y !== bounds.y) {
    overlayWindow.setPosition(bounds.x, bounds.y);
  }
}

function resizeOverlayToContent(requestedHeight: number): void {
  if (!overlayWindow || !Number.isFinite(requestedHeight)) return;
  const { workArea } = screen.getDisplayMatching(overlayWindow.getBounds());
  const maxHeight = Math.max(220, workArea.height - OVERLAY_MARGIN * 2);
  const height = Math.min(Math.max(220, Math.ceil(requestedHeight)), maxHeight);
  overlayContentHeight = height;
  const nextPos = resolveOverlayPosition(
    SettingsRepository.get(),
    height,
    overlayWindow.getBounds().width
  );
  setOverlayBounds(nextPos);
}

function applyRuntimeSettings(settings: SettingsRow): void {
  if (overlayWindow) {
    const currentBounds = overlayWindow.getBounds();
    const nextPos = resolveOverlayPosition(settings, currentBounds.height, currentBounds.width);
    setOverlayBounds(nextPos);
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
  registeredShortcuts.forEach((shortcut) => globalShortcut.unregister(shortcut));
  registeredShortcuts = [];

  const shortcut = settings.shortcut.trim() || "CTRL+ALT+Q";
  const clickThroughShortcut = settings.clickThroughShortcut.trim() || "CTRL+ALT+P";
  const registerShortcut = (accelerator: string, action: () => void) => {
    try {
      const registered = globalShortcut.register(accelerator, action);
      if (registered) {
        registeredShortcuts.push(accelerator);
      } else {
        console.error(`Failed to register shortcut: ${accelerator}`);
      }
    } catch (error) {
      console.error("Invalid global shortcut:", accelerator, error);
    }
  };
  registerShortcut(shortcut, () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible() && mainWindow.isFocused()) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
  if (clickThroughShortcut.toLowerCase() === shortcut.toLowerCase()) {
    console.error("Click-through shortcut must differ from the Quest Manager shortcut.");
  } else {
    registerShortcut(clickThroughShortcut, () =>
      setOverlayClickThrough(!overlayClickThroughEnabled)
    );
  }
}

function createOverlayWindow(settings: SettingsRow): void {
  overlayContentHeight = OVERLAY_HEIGHT;
  const { x, y, height } = resolveOverlayPosition(settings);

  overlayWindow = new BrowserWindow({
    x,
    y,
    width: OVERLAY_WIDTH,
    height,
    minWidth: 280,
    minHeight: 220,
    frame: false,
    thickFrame: true,
    transparent: true,
    hasShadow: false,
    resizable: true,
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
  overlayWindow.webContents.on("did-finish-load", () => {
    if (!overlayWindow || overlayWindow.isDestroyed()) return;
    overlayWindow.setIgnoreMouseEvents(overlayClickThroughEnabled, { forward: true });
    overlayWindow.webContents.send(
      "window:overlayClickThroughChanged",
      overlayClickThroughEnabled
    );
  });

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
    ipcMain.handle("window:getOverlayClickThrough", (event) => {
      assertTrustedIpcSender(event);
      return overlayClickThroughEnabled;
    });
    ipcMain.handle("window:setOverlayClickThrough", (event, enabled: boolean) => {
      assertTrustedIpcSender(event);
      setOverlayClickThrough(Boolean(enabled));
    });
    registerIpcHandlers({
      onSettingsUpdated: applyRuntimeSettings,
      focusMainWindow,
      focusOverlayWindow,
      moveOverlayWindow,
    });
    applyRuntimeSettings(settings);
    createTray();
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
  if (process.platform !== "darwin" && !tray) {
    app.quit();
  }
});

app.on("before-quit", () => {
  isQuitting = true;
});

app.on("will-quit", () => {
  registeredShortcuts.forEach((shortcut) => globalShortcut.unregister(shortcut));
  registeredShortcuts = [];
  globalShortcut.unregisterAll();
  tray?.destroy();
  tray = null;
});
