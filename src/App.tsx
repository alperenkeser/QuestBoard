import { useEffect } from "react";
import { Overlay } from "./pages/Overlay";
import { QuestManager } from "./pages/QuestManager";
import { useQuestStore } from "./store/questStore";
import { useUserStore } from "./store/userStore";
import { useSettingsStore } from "./store/settingsStore";

// Renders either the transparent Overlay HUD or the Quest Manager window,
// depending on which Electron window (?window=overlay) loaded this bundle.
function App(): JSX.Element {
  const isOverlayWindow = new URLSearchParams(window.location.search).get("window") === "overlay";
  const hydrateQuests = useQuestStore((state) => state.hydrate);
  const hydrateUser = useUserStore((state) => state.hydrate);
  const hydrateSettings = useSettingsStore((state) => state.hydrate);
  const settings = useSettingsStore((state) => state.settings);

  useEffect(() => {
    document.body.classList.toggle("window-main", !isOverlayWindow);
    document.body.classList.toggle("window-overlay", isOverlayWindow);
  }, [isOverlayWindow]);

  // Every window (overlay + Quest Manager) loads persisted quests/profile/
  // settings independently, then stays in sync via db:changed broadcasts
  // (questStore.hydrate() subscribes once itself; profile/settings are
  // refreshed here because they can change from either window).
  useEffect(() => {
    void hydrateQuests();
    void hydrateUser();
    void hydrateSettings();
    return window.questboard.onDbChanged(() => {
      void hydrateUser();
      void hydrateSettings();
    });
  }, [hydrateQuests, hydrateUser, hydrateSettings]);

  useEffect(() => {
    const root = document.documentElement;
    if (!settings) return;

    const themeMap: Record<string, { surfaceRgb: string; borderRgb: string; borderAlpha: number }> = {
      dark: { surfaceRgb: "20,22,29", borderRgb: "255,255,255", borderAlpha: 0.2 },
      midnight: { surfaceRgb: "12,24,40", borderRgb: "158,206,255", borderAlpha: 0.28 },
      violet: { surfaceRgb: "29,18,44", borderRgb: "200,164,255", borderAlpha: 0.28 },
    };
    const theme = themeMap[settings.theme] ?? themeMap.dark;

    root.style.setProperty("--qb-glass-rgb", theme.surfaceRgb);
    root.style.setProperty("--qb-border-rgb", theme.borderRgb);
    root.style.setProperty("--qb-glass-alpha", String(settings.transparency));
    root.style.setProperty("--qb-border-alpha", String(theme.borderAlpha));
    root.style.setProperty("--qb-blur", `${settings.blurAmount}px`);
    root.dataset.theme = settings.theme;
    root.dir = settings.language === "ar" ? "rtl" : "ltr";
  }, [settings]);

  if (isOverlayWindow) {
    return <Overlay />;
  }

  return <QuestManager />;
}

export default App;
