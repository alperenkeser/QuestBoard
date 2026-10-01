import { getDb } from "../database/sqlite";
import type { SettingsRow } from "../database/rowTypes";

export type UpdateSettingsInput = Partial<Omit<SettingsRow, "id">>;

const VALID_THEMES = new Set(["dark", "midnight", "violet"]);
const VALID_ANCHORS = new Set([
  "right-top",
  "right-middle",
  "right-bottom",
  "left-top",
  "left-middle",
  "left-bottom",
  "custom",
]);
const VALID_LANGUAGES = new Set(["tr", "en", "es", "de", "fr", "it", "pt", "ru", "ja", "zh", "ar"]);

export interface BoardColumnRecord {
  id: string;
  title: string;
  status: "Archived" | "Active" | "Completed";
}

export function parseBoardColumns(value: string): BoardColumnRecord[] {
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed) || parsed.length < 3) {
    throw new Error("Board must contain at least three columns.");
  }
  const columns = parsed.map((column): BoardColumnRecord => {
    if (
      !column ||
      typeof column !== "object" ||
      !("id" in column) ||
      !("title" in column) ||
      !("status" in column)
    ) {
      throw new Error("Invalid board column configuration.");
    }
    const value = column as Record<string, unknown>;
    if (
      typeof value.id !== "string" ||
      typeof value.title !== "string" ||
      !["Archived", "Active", "Completed"].includes(String(value.status))
    ) {
      throw new Error("Invalid board column configuration.");
    }
    return {
      id: value.id.slice(0, 64),
      title: value.title.trim().slice(0, 48),
      status: value.status as BoardColumnRecord["status"],
    };
  });
  if (columns.some((column) => !column.id || !column.title)) {
    throw new Error("Board columns need both an id and a title.");
  }
  if (new Set(columns.map((column) => column.id)).size !== columns.length) {
    throw new Error("Board column ids must be unique.");
  }
  if (!columns.some((column) => column.status === "Archived") ||
      !columns.some((column) => column.status === "Active") ||
      !columns.some((column) => column.status === "Completed")) {
    throw new Error("Board must retain a backlog, active, and completed column.");
  }
  return columns;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sanitizeInput(input: UpdateSettingsInput): UpdateSettingsInput {
  return {
    ...(input.transparency !== undefined && {
      transparency: clampNumber(input.transparency, 0, 1),
    }),
    ...(input.blurAmount !== undefined && {
      blurAmount: Math.round(clampNumber(input.blurAmount, 8, 40)),
    }),
    ...(input.theme !== undefined && {
      theme: VALID_THEMES.has(input.theme) ? input.theme : "dark",
    }),
    ...(input.alwaysOnTop !== undefined && {
      alwaysOnTop: input.alwaysOnTop ? 1 : 0,
    }),
    ...(input.launchOnStartup !== undefined && {
      launchOnStartup: input.launchOnStartup ? 1 : 0,
    }),
    ...(input.shortcut !== undefined && {
      shortcut: String(input.shortcut || "").trim().slice(0, 64) || "CTRL+ALT+Q",
    }),
    ...(input.overlayAnchor !== undefined && {
      overlayAnchor: VALID_ANCHORS.has(input.overlayAnchor) ? input.overlayAnchor : "right-top",
    }),
    ...(input.overlayX !== undefined && {
      overlayX: input.overlayX === null ? null : Math.round(input.overlayX),
    }),
    ...(input.overlayY !== undefined && {
      overlayY: input.overlayY === null ? null : Math.round(input.overlayY),
    }),
    ...(input.boardBacklogLabel !== undefined && {
      boardBacklogLabel: String(input.boardBacklogLabel || "").trim().slice(0, 48) || "Görevler",
    }),
    ...(input.boardActiveLabel !== undefined && {
      boardActiveLabel:
        String(input.boardActiveLabel || "").trim().slice(0, 48) || "Aktif Görevler",
    }),
    ...(input.boardDoneLabel !== undefined && {
      boardDoneLabel:
        String(input.boardDoneLabel || "").trim().slice(0, 48) || "Tamamlanan Görevler",
    }),
    ...(input.boardColumns !== undefined && {
      boardColumns: JSON.stringify(parseBoardColumns(input.boardColumns)),
    }),
    ...(input.language !== undefined && {
      language: VALID_LANGUAGES.has(input.language) ? input.language : "tr",
    }),
  };
}

/** Raw SQL access to the singleton `settings` row (id = 1). */
export const SettingsRepository = {
  get(): SettingsRow {
    return getDb().prepare("SELECT * FROM settings WHERE id = 1").get() as SettingsRow;
  },

  update(input: UpdateSettingsInput): SettingsRow {
    const current = this.get();
    const sanitized = sanitizeInput(input);
    const next: SettingsRow = { ...current, ...sanitized };
    getDb()
      .prepare(
        `UPDATE settings SET transparency=@transparency, blurAmount=@blurAmount, theme=@theme,
         alwaysOnTop=@alwaysOnTop, launchOnStartup=@launchOnStartup, shortcut=@shortcut,
         overlayAnchor=@overlayAnchor, overlayX=@overlayX, overlayY=@overlayY,
         boardBacklogLabel=@boardBacklogLabel, boardActiveLabel=@boardActiveLabel, boardDoneLabel=@boardDoneLabel,
         boardColumns=@boardColumns, language=@language
         WHERE id = 1`
      )
      .run(next);
    return next;
  },

  getBoardColumns(): BoardColumnRecord[] {
    return parseBoardColumns(this.get().boardColumns);
  },
};
