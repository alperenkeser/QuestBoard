import type { BoardColumn } from "./quest";

export type ThemeName = "dark" | "midnight" | "violet";
export type OverlayAnchor =
  | "right-top"
  | "right-middle"
  | "right-bottom"
  | "left-top"
  | "left-middle"
  | "left-bottom"
  | "custom";

export interface Settings {
  transparency: number;
  blurAmount: number;
  theme: ThemeName;
  alwaysOnTop: boolean;
  launchOnStartup: boolean;
  shortcut: string;
  overlayAnchor: OverlayAnchor;
  overlayX: number | null;
  overlayY: number | null;
  boardBacklogLabel: string;
  boardActiveLabel: string;
  boardDoneLabel: string;
  boardColumns: BoardColumn[];
  language: string;
  showIconsOnHover: boolean;
  fontSize: number;
  clickThroughShortcut: string;
  overlayIdleDimMinutes: number;
}
