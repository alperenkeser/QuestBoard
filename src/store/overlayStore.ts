import { create } from "zustand";

export const MAX_OVERLAY_QUESTS = 3;

interface OverlayState {
  maxVisibleQuests: number;
  dragEnabled: boolean;
  collapsed: boolean;
  setDragEnabled: (enabled: boolean) => void;
  setCollapsed: (collapsed: boolean) => void;
}

// Settings page (Phase 7) will make maxVisibleQuests and overlay position configurable.
export const useOverlayStore = create<OverlayState>((set) => ({
  maxVisibleQuests: MAX_OVERLAY_QUESTS,
  dragEnabled: false,
  collapsed: false,
  setDragEnabled: (enabled) => set({ dragEnabled: enabled }),
  setCollapsed: (collapsed) => set({ collapsed }),
}));
