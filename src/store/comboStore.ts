import { create } from "zustand";

/** How long a gap between subtask completions is still considered "rapid". */
const COMBO_WINDOW_MS = 3000;
const MAX_COMBO = 4;

// Bonus multiplier applied to a subtask's base XP share once a combo streak
// is active. comboCount 1 = no streak yet (first completion); each further
// completion within COMBO_WINDOW_MS bumps the streak, up to x4.
const COMBO_MULTIPLIERS: Record<number, number> = { 1: 1, 2: 1.25, 3: 1.5, 4: 2 };

export interface ComboResult {
  comboCount: number;
  multiplier: number;
}

interface ComboState {
  comboCount: number;
  lastCompletionAt: number | null;
  /** Call on every subtask completion (not un-completion). Returns the resulting combo tier. */
  registerCompletion: () => ComboResult;
  resetCombo: () => void;
}

let resetTimer: ReturnType<typeof setTimeout> | null = null;

export const useComboStore = create<ComboState>((set, get) => ({
  comboCount: 1,
  lastCompletionAt: null,

  registerCompletion: () => {
    const now = Date.now();
    const { lastCompletionAt, comboCount } = get();
    const withinWindow = lastCompletionAt !== null && now - lastCompletionAt <= COMBO_WINDOW_MS;
    const nextCount = withinWindow ? Math.min(comboCount + 1, MAX_COMBO) : 1;

    set({ comboCount: nextCount, lastCompletionAt: now });

    if (resetTimer) clearTimeout(resetTimer);
    resetTimer = setTimeout(() => get().resetCombo(), COMBO_WINDOW_MS);

    return { comboCount: nextCount, multiplier: COMBO_MULTIPLIERS[nextCount] ?? 1 };
  },

  resetCombo: () => set({ comboCount: 1, lastCompletionAt: null }),
}));
