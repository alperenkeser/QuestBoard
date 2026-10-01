import { create } from "zustand";
import type { User } from "../types";
import { XPService } from "../services/XPService";

interface UserState {
  user: User | null;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  addXp: (amount: number) => void;
  incrementCompletedQuests: () => void;
  incrementDailyCompletedTasks: () => void;
}

/**
 * Player profile (Total XP, Level, Completed Quests, Daily Completed Tasks).
 * Every mutation here is a thin call into XPService -> IPC -> UserRepository;
 * this store just holds the latest snapshot for the Player Profile /
 * Daily Summary UI to read reactively.
 */
export const useUserStore = create<UserState>((set) => ({
  user: null,
  isHydrated: false,

  hydrate: async () => {
    const user = await XPService.get();
    set({ user, isHydrated: true });
  },

  addXp: (amount) => {
    XPService.addXp(amount)
      .then((user) => set({ user }))
      .catch(console.error);
  },

  incrementCompletedQuests: () => {
    XPService.incrementCompletedQuests()
      .then((user) => set({ user }))
      .catch(console.error);
  },

  incrementDailyCompletedTasks: () => {
    XPService.incrementDailyCompletedTasks()
      .then((user) => set({ user }))
      .catch(console.error);
  },
}));
