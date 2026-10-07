import type { Settings } from "../types";
import type { SettingsRowDto } from "../types/bridge";

function toSettings(row: SettingsRowDto): Settings {
  const boardColumns = JSON.parse(row.boardColumns) as Settings["boardColumns"];
  if (!Array.isArray(boardColumns)) {
    throw new Error("Invalid board columns in settings.");
  }
  return {
    transparency: row.transparency,
    blurAmount: row.blurAmount,
    theme: row.theme as Settings["theme"],
    alwaysOnTop: row.alwaysOnTop === 1,
    launchOnStartup: row.launchOnStartup === 1,
    shortcut: row.shortcut,
    overlayAnchor: row.overlayAnchor as Settings["overlayAnchor"],
    overlayX: row.overlayX,
    overlayY: row.overlayY,
    boardBacklogLabel: row.boardBacklogLabel,
    boardActiveLabel: row.boardActiveLabel,
    boardDoneLabel: row.boardDoneLabel,
    boardColumns,
    language: row.language,
    showIconsOnHover: row.showIconsOnHover === 1,
    fontSize: row.fontSize,
    clickThroughShortcut: row.clickThroughShortcut,
    overlayIdleDimMinutes: row.overlayIdleDimMinutes,
  };
}

function toRowPatch(patch: Partial<Settings>): Partial<SettingsRowDto> {
  return {
    ...(patch.transparency !== undefined && { transparency: patch.transparency }),
    ...(patch.blurAmount !== undefined && { blurAmount: patch.blurAmount }),
    ...(patch.theme !== undefined && { theme: patch.theme }),
    ...(patch.alwaysOnTop !== undefined && { alwaysOnTop: patch.alwaysOnTop ? 1 : 0 }),
    ...(patch.launchOnStartup !== undefined && { launchOnStartup: patch.launchOnStartup ? 1 : 0 }),
    ...(patch.shortcut !== undefined && { shortcut: patch.shortcut }),
    ...(patch.overlayAnchor !== undefined && { overlayAnchor: patch.overlayAnchor }),
    ...(patch.overlayX !== undefined && { overlayX: patch.overlayX }),
    ...(patch.overlayY !== undefined && { overlayY: patch.overlayY }),
    ...(patch.boardBacklogLabel !== undefined && { boardBacklogLabel: patch.boardBacklogLabel }),
    ...(patch.boardActiveLabel !== undefined && { boardActiveLabel: patch.boardActiveLabel }),
    ...(patch.boardDoneLabel !== undefined && { boardDoneLabel: patch.boardDoneLabel }),
    ...(patch.boardColumns !== undefined && { boardColumns: JSON.stringify(patch.boardColumns) }),
    ...(patch.language !== undefined && { language: patch.language }),
    ...(patch.showIconsOnHover !== undefined && { showIconsOnHover: patch.showIconsOnHover ? 1 : 0 }),
    ...(patch.fontSize !== undefined && { fontSize: patch.fontSize }),
    ...(patch.clickThroughShortcut !== undefined && {
      clickThroughShortcut: patch.clickThroughShortcut,
    }),
    ...(patch.overlayIdleDimMinutes !== undefined && {
      overlayIdleDimMinutes: patch.overlayIdleDimMinutes,
    }),
  };
}

/** Renderer-side data-access layer for app settings (overlay glassmorphism knobs, hotkeys, etc). */
export const SettingsService = {
  async get(): Promise<Settings> {
    const row = await window.questboard.db.settings.get();
    return toSettings(row);
  },

  async update(patch: Partial<Settings>): Promise<Settings> {
    const row = await window.questboard.db.settings.update(toRowPatch(patch));
    return toSettings(row);
  },
};
