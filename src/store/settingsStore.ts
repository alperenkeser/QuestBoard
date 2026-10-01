import { create } from "zustand";
import type { Settings } from "../types";
import { SettingsService } from "../services/SettingsService";

interface SettingsState {
  settings: Settings | null;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => void;
}

// Backing store for the Phase 7 Settings page. Persistence flows through
// SettingsService -> IPC -> SettingsRepository (SQLite), never directly.
export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  isHydrated: false,

  hydrate: async () => {
    const settings = await SettingsService.get();
    set({ settings, isHydrated: true });
  },

  updateSettings: (patch) => {
    set((state) => ({ settings: state.settings ? { ...state.settings, ...patch } : state.settings }));
    SettingsService.update(patch)
      .then((settings) => set({ settings }))
      .catch(console.error);
  },
}));
