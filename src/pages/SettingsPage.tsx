import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useSettingsStore } from "../store/settingsStore";
import type { OverlayAnchor, Settings, ThemeName } from "../types";
import { useTranslation } from "../i18n";
import { PriorityIndicator } from "../components/PriorityIndicator";

const THEMES: Array<{ value: ThemeName; label: string; hint: string }> = [
  { value: "dark", label: "Dark", hint: "Balanced neutral glass" },
  { value: "midnight", label: "Midnight", hint: "Cool blue futuristic glow" },
  { value: "violet", label: "Violet", hint: "Purple RPG-style accent" },
];
const OVERLAY_POSITIONS: Array<{ value: OverlayAnchor; label: string }> = [
  { value: "right-top", label: "Sağ Üst" },
  { value: "right-middle", label: "Sağ Orta" },
  { value: "right-bottom", label: "Sağ Alt" },
  { value: "left-top", label: "Sol Üst" },
  { value: "left-middle", label: "Sol Orta" },
  { value: "left-bottom", label: "Sol Alt" },
  { value: "custom", label: "Custom" },
];

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}

function ToggleRow({ label, description, checked, onChange }: ToggleRowProps): JSX.Element {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-hud-border bg-hud-bg p-3 backdrop-blur-hud">
      <span>
        <span className="block text-sm font-semibold text-white">{label}</span>
        <span className="text-xs text-white/55">{description}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-1 h-6 w-11 rounded-full border transition-colors ${
          checked
            ? "border-emerald-300/50 bg-emerald-400/30"
            : "border-white/20 bg-white/10"
        }`}
      >
        <span
          className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white transition-all ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

export function SettingsPage(): JSX.Element {
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const t = useTranslation();
  const [shortcutDraft, setShortcutDraft] = useState(settings?.shortcut ?? "");
  const [fontSizeDraft, setFontSizeDraft] = useState(String(settings?.fontSize ?? 14));
  const [columnDraft, setColumnDraft] = useState<Settings["boardColumns"]>([]);

  useEffect(() => {
    if (settings) {
      setShortcutDraft(settings.shortcut);
      setFontSizeDraft(String(settings.fontSize));
      setColumnDraft(settings.boardColumns);
    }
  }, [settings]);

  if (!settings) {
    return (
      <div className="rounded-xl border border-hud-border bg-hud-bg p-4 text-sm text-white/60 backdrop-blur-hud">
        Loading settings...
      </div>
    );
  }

  const syncShortcutDraft = (next: Settings) => {
    setShortcutDraft(next.shortcut);
  };

  const updateAndSync = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    updateSettings(patch);
    if (patch.shortcut !== undefined) {
      syncShortcutDraft(next);
    }
  };

  const saveFontSize = () => {
    const parsed = Number(fontSizeDraft);
    if (!Number.isFinite(parsed)) {
      setFontSizeDraft(String(settings.fontSize));
      return;
    }
    const fontSize = Math.min(36, Math.max(8, Math.round(parsed)));
    setFontSizeDraft(String(fontSize));
    if (fontSize !== settings.fontSize) updateAndSync({ fontSize });
  };

  const saveColumnTitle = (id: string, title: string) => {
    const nextColumns = columnDraft.map((column) =>
      column.id === id ? { ...column, title: title.trim() || column.title } : column
    );
    setColumnDraft(nextColumns);
    updateAndSync({ boardColumns: nextColumns });
  };

  const addColumn = () => {
    const nextColumns = [
      ...columnDraft,
      {
        id: crypto.randomUUID(),
        title: `${t("column")} ${columnDraft.length + 1}`,
        status: "Active" as const,
      },
    ];
    setColumnDraft(nextColumns);
    updateAndSync({ boardColumns: nextColumns });
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex flex-col gap-4"
    >
      <div className="rounded-xl border border-hud-border bg-hud-bg p-4 backdrop-blur-hud">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white/70">{t("appearance")}</h2>

        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-white/60">
              {t("opacity")} ({formatPercent(settings.transparency)})
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={settings.transparency}
              onChange={(e) => updateAndSync({ transparency: Number(e.target.value) })}
              className="w-full accent-sky-400"
            />
            <p className="mt-1 text-[11px] text-white/45">
              {t("opacityHint")}
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-white/60">
              {t("widgetFontSize")}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                list="questboard-font-sizes"
                value={fontSizeDraft}
                onChange={(e) => setFontSizeDraft(e.target.value)}
                onBlur={saveFontSize}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                aria-label={t("widgetFontSize")}
                className="w-20 rounded-md border border-hud-border bg-hud-bg px-2 py-2 text-sm text-white outline-none focus:border-sky-400/60"
              />
              <datalist id="questboard-font-sizes">
                {[8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36].map((size) => (
                  <option key={size} value={size} />
                ))}
              </datalist>
              <span
                className="rounded-md border border-hud-border bg-white/5 px-3 py-1 text-white"
                style={{ fontSize: `${Math.max(8, Number(fontSizeDraft) || 14)}px` }}
                aria-hidden="true"
              >
                Aa
              </span>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-white/60">{t("language")}</label>
            <select
              value={settings.language}
              onChange={(e) => updateAndSync({ language: e.target.value })}
              className="w-full rounded-md border border-hud-border bg-hud-bg px-2 py-2 text-sm text-white"
            >
              {[
                ["en", "English"], ["tr", "Türkçe"], ["es", "Español"], ["de", "Deutsch"],
                ["fr", "Français"], ["it", "Italiano"], ["pt", "Português"], ["ru", "Русский"],
                ["ja", "日本語"], ["zh", "中文"], ["ar", "العربية"],
              ].map(([code, label]) => <option key={code} value={code}>{label}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-white/60">{t("theme")}</label>
          <div className="grid gap-2 sm:grid-cols-3">
            {THEMES.map((theme) => {
              const active = settings.theme === theme.value;
              return (
                <button
                  key={theme.value}
                  type="button"
                  onClick={() => updateAndSync({ theme: theme.value })}
                  className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                    active
                      ? "border-sky-300/60 bg-sky-400/20 text-sky-200"
                      : "border-hud-border bg-white/5 text-white/75 hover:bg-white/10"
                  }`}
                >
                  <span className="block text-sm font-semibold">{theme.label}</span>
                  <span className="text-[11px] text-white/50">{theme.hint}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <ToggleRow
          label={t("showIconsOnHover")}
          description={t("showIconsOnHoverHint")}
          checked={settings.showIconsOnHover}
          onChange={(showIconsOnHover) => updateAndSync({ showIconsOnHover })}
        />
        <ToggleRow
          label={t("alwaysOnTop")}
          description={t("alwaysOnTopHint")}
          checked={settings.alwaysOnTop}
          onChange={(alwaysOnTop) => updateAndSync({ alwaysOnTop })}
        />
        <ToggleRow
          label={t("launchOnStartup")}
          description={t("launchOnStartupHint")}
          checked={settings.launchOnStartup}
          onChange={(launchOnStartup) => updateAndSync({ launchOnStartup })}
        />
      </div>

      <div className="rounded-xl border border-hud-border bg-hud-bg p-4 backdrop-blur-hud">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white/70">{t("widgetPosition")}</h2>
        <p className="mt-1 text-xs text-white/50">
          Taşıma açıkken konum otomatik olarak <span className="font-semibold text-amber-200">Custom</span> olur.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {OVERLAY_POSITIONS.map((pos) => {
            const active = settings.overlayAnchor === pos.value;
            return (
              <button
                key={pos.value}
                type="button"
                onClick={() =>
                  updateAndSync({
                    overlayAnchor: pos.value,
                    ...(pos.value === "custom" ? {} : { overlayX: null, overlayY: null }),
                  })
                }
                className={`rounded-md border px-2 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "border-sky-300/60 bg-sky-400/20 text-sky-200"
                    : "border-hud-border bg-white/5 text-white/70 hover:bg-white/10"
                }`}
              >
                {pos.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-hud-border bg-hud-bg p-4 backdrop-blur-hud">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white/70">{t("boardColumns")}</h2>
        <p className="mt-1 text-xs text-white/50">
          {t("boardColumnsHint")}
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {columnDraft.map((column) => (
            <div key={column.id} className="flex items-center gap-3">
              <input
                value={column.title}
                onChange={(e) =>
                  setColumnDraft((current) =>
                    current.map((item) =>
                      item.id === column.id ? { ...item, title: e.target.value } : item
                    )
                  )
                }
                onBlur={(e) => saveColumnTitle(column.id, e.target.value)}
                className="w-full rounded-md border border-hud-border bg-hud-bg px-2 py-1.5 text-sm text-white outline-none focus:border-sky-400/60"
              />
              <span className="w-20 shrink-0 text-xs text-white/50">{column.status}</span>
            </div>
          ))}
          <button
            type="button"
            onClick={addColumn}
            className="self-start rounded-md border border-hud-border px-3 py-1.5 text-sm text-white/80 hover:bg-white/10"
          >
            {t("addColumn")}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-hud-border bg-hud-bg p-4 backdrop-blur-hud">
        <label className="mb-1 block text-xs font-medium text-white/60">Quick Toggle Shortcut</label>
        <input
          value={shortcutDraft}
          onChange={(e) => setShortcutDraft(e.target.value)}
          onBlur={() => updateAndSync({ shortcut: shortcutDraft })}
          placeholder="CTRL+ALT+Q"
          className="w-full rounded-lg border border-hud-border bg-hud-bg px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-sky-400/60"
        />
        <p className="mt-2 text-xs text-white/45">
          Saved shortcut is registered globally to toggle/focus the Quest Manager window.
        </p>
      </div>

      <motion.div
        layout
        className="rounded-xl border border-hud-border bg-hud-bg p-4 backdrop-blur-hud"
      >
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/60">Preview</h3>
        <motion.div
          layout
          whileHover={{ scale: 1.01 }}
          className="rounded-hud border border-hud-border bg-hud-bg p-3 shadow-hud backdrop-blur-hud"
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
              <PriorityIndicator priority="High" />
              Sprint Release
            </span>
            <span className="rounded-full bg-difficulty-epic px-2 py-0.5 text-[11px] font-semibold text-black">
              Epic · 1000 XP
            </span>
          </div>
          <div className="mt-2 h-[3px] rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 to-violet-400"
              initial={false}
              animate={{ width: "62%" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </motion.div>
      </motion.div>
    </motion.section>
  );
}
