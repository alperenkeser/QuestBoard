import { create } from "zustand";
import type { Quest, QuestFormInput, QuestStatus, Subtask } from "../types";
import { xpForDifficulty, PRIORITY_WEIGHT } from "../types";
import { computeCompletionPercentage } from "../services/progress";
import { xpShareForSubtask } from "../services/xpDistribution";
import { QuestService } from "../services/QuestService";
import { useUserStore } from "./userStore";
import { useComboStore } from "./comboStore";
import { useSettingsStore } from "./settingsStore";
import { MAX_OVERLAY_QUESTS } from "./overlayStore";

export type { QuestFormInput };

/** Transient feedback for the "+N XP" floating text shown next to a subtask. */
export interface XpFeedbackEvent {
  amount: number;
  comboCount: number;
  nonce: number;
}

interface QuestState {
  quests: Quest[];
  subtasks: Subtask[];
  isHydrated: boolean;
  /** subtaskId -> most recent XP feedback event, consumed/cleared by the UI once shown. */
  lastXpEvents: Record<string, XpFeedbackEvent>;

  // Derived reads
  activeQuestsSortedByPriority: () => Quest[];
  overlayQuests: () => Quest[];
  subtasksForQuest: (questId: string) => Subtask[];

  // Loads persisted state from SQLite (via QuestService) and subscribes to
  // cross-window change notifications so the overlay + Quest Manager windows
  // stay in sync even though each renderer process has its own Zustand store.
  hydrate: () => Promise<void>;

  // Quest CRUD
  createQuest: (input: QuestFormInput) => void;
  updateQuest: (questId: string, input: QuestFormInput) => void;
  deleteQuest: (questId: string) => void;
  archiveQuest: (questId: string) => void;
  restoreQuest: (questId: string) => void;
  /** Manually marks a quest Completed (for quests with no subtasks to auto-drive it) and awards its full XP. */
  completeQuest: (questId: string) => void;
  /** Moves a quest between workflow columns without XP side-effects. */
  moveQuestToStatus: (questId: string, columnId: string) => void;
  toggleOverlayPinned: (questId: string, pinned: boolean) => boolean;

  // Subtask mutations (used by both the overlay HUD and the Quest Manager)
  toggleSubtask: (subtaskId: string) => void;
  addSubtask: (questId: string, title: string) => void;
  removeSubtask: (subtaskId: string) => void;
  reorderSubtasks: (questId: string, orderedSubtaskIds: string[]) => void;
  clearXpEvent: (subtaskId: string) => void;
}

const now = () => new Date().toISOString();

function recomputeQuest(
  quest: Omit<Quest, "completionPercentage">,
  subtasks: Subtask[],
  syncStatusFromProgress = false
): Quest {
  const questSubtasks = subtasks.filter((s) => s.questId === quest.id);
  const completionPercentage = computeCompletionPercentage(questSubtasks);

  // Status follows progress after a subtask mutation, but persisted/manual
  // board moves remain authoritative during hydration and drag-drop.
  let status: QuestStatus = quest.status;
  if (syncStatusFromProgress) {
    if (questSubtasks.length > 0 && completionPercentage === 100) {
      status = "Completed";
    } else if (status === "Completed" && completionPercentage < 100) {
      status = "Active";
    }
  }

  return { ...quest, completionPercentage, status };
}

function recomputeAll(
  quests: Array<Omit<Quest, "completionPercentage">>,
  subtasks: Subtask[],
  syncStatusFromProgress = false
): Quest[] {
  return quests.map((q) => recomputeQuest(q, subtasks, syncStatusFromProgress));
}

// One db:changed subscription per renderer process, regardless of how many
// times hydrate() runs.
let unsubscribeFromChanges: (() => void) | null = null;
let unsubscribeFromOverlayPinChanges: (() => void) | null = null;
let hydrationRequestId = 0;

export const useQuestStore = create<QuestState>((set, get) => ({
  quests: [],
  subtasks: [],
  isHydrated: false,
  lastXpEvents: {},

  activeQuestsSortedByPriority: () => {
    const { quests } = get();
    return quests
      .filter((q) => q.status === "Active")
      .sort((a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]);
  },

  overlayQuests: () =>
    get()
      .quests.filter((q) => q.showInOverlay && q.status !== "Archived")
      .sort((a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]),

  subtasksForQuest: (questId) =>
    get()
      .subtasks.filter((s) => s.questId === questId)
      .sort((a, b) => a.order - b.order),

  hydrate: async () => {
    const requestId = ++hydrationRequestId;
    if (!unsubscribeFromChanges) {
      unsubscribeFromChanges = QuestService.onChanged(() => {
        void get().hydrate();
      });
    }
    if (!unsubscribeFromOverlayPinChanges) {
      unsubscribeFromOverlayPinChanges = QuestService.onOverlayPinChanged((questId, pinned) => {
        hydrationRequestId += 1;
        set((state) => ({
          quests: state.quests.map((quest) =>
            quest.id === questId ? { ...quest, showInOverlay: pinned } : quest
          ),
        }));
      });
    }

    const { quests, subtasks } = await QuestService.getAllWithSubtasks();
    if (requestId !== hydrationRequestId) return;
    set({ quests: recomputeAll(quests, subtasks), subtasks, isHydrated: true });
  },

  createQuest: (input) => {
    const firstColumn = useSettingsStore.getState().settings?.boardColumns[0];
    const boardColumnId = firstColumn?.id ?? "backlog";
    const status = firstColumn?.status ?? "Archived";
    set((state) => {
      // Optimistic temp id; the persisted row (with its real id) arrives via
      // the db:changed -> hydrate() round trip and replaces this entry.
      const questId = `pending-${Date.now()}`;
      const timestamp = now();
      const newQuest: Omit<Quest, "completionPercentage"> = {
        id: questId,
        title: input.title,
        description: input.description,
        priority: input.priority,
        difficulty: input.difficulty,
        xpReward: xpForDifficulty(input.difficulty),
        status,
        category: input.category,
        createdDate: timestamp,
        updatedDate: timestamp,
        dueDate: input.dueDate,
        showInOverlay: false,
        boardColumnId,
        boardOrder: state.quests.filter((quest) => quest.boardColumnId === boardColumnId).length,
      };
      const newSubtasks: Subtask[] = input.subtaskTitles.map((title, index) => ({
        id: `pending-subtask-${index}-${Date.now()}`,
        questId,
        title,
        completed: false,
        order: index,
      }));
      const subtasks = [...state.subtasks, ...newSubtasks];
      return { subtasks, quests: recomputeAll([...state.quests, newQuest], subtasks) };
    });
    QuestService.create(input, boardColumnId)
      .then(() => get().hydrate())
      .catch((error) => {
        console.error("Failed to create quest:", error);
        void get().hydrate();
      });
  },

  updateQuest: (questId, input) => {
    set((state) => {
      // Full-replace the subtask list from the form so add/remove/reorder in
      // the editor is reflected without needing separate diffing logic.
      const otherSubtasks = state.subtasks.filter((s) => s.questId !== questId);
      const newSubtasks: Subtask[] = input.subtaskTitles.map((title, index) => {
        const existing = state.subtasks.find(
          (s) => s.questId === questId && s.order === index && s.title === title
        );
        return {
          id: existing?.id ?? `pending-subtask-${index}-${Date.now()}`,
          questId,
          title,
          completed: existing?.completed ?? false,
          order: index,
        };
      });
      const subtasks = [...otherSubtasks, ...newSubtasks];

      const quests = state.quests.map((q) =>
        q.id === questId
          ? {
              ...q,
              title: input.title,
              description: input.description,
              priority: input.priority,
              difficulty: input.difficulty,
              xpReward: xpForDifficulty(input.difficulty),
              category: input.category,
              dueDate: input.dueDate,
            }
          : q
      );

      return { subtasks, quests: recomputeAll(quests, subtasks) };
    });
    QuestService.update(questId, input).catch(console.error);
  },

  deleteQuest: (questId) => {
    set((state) => ({
      quests: state.quests.filter((q) => q.id !== questId),
      subtasks: state.subtasks.filter((s) => s.questId !== questId),
    }));
    QuestService.delete(questId).catch(console.error);
  },

  archiveQuest: (questId) => {
    const column = useSettingsStore.getState().settings?.boardColumns.find((item) => item.status === "Archived");
    if (!column) return;
    set((state) => ({
      quests: state.quests.map((q) =>
        q.id === questId
          ? {
              ...q,
              status: "Archived" as QuestStatus,
              boardColumnId: column.id,
              showInOverlay: false,
              updatedDate: now(),
            }
          : q
      ),
    }));
    QuestService.setBoardColumn(questId, column.id).catch(console.error);
  },

  restoreQuest: (questId) => {
    const column = useSettingsStore.getState().settings?.boardColumns.find((item) => item.status === "Active");
    if (!column) return;
    set((state) => {
      const quests = state.quests.map((q) =>
        q.id === questId
          ? { ...q, status: "Active" as QuestStatus, boardColumnId: column.id, updatedDate: now() }
          : q
      );
      return { quests: recomputeAll(quests, state.subtasks) };
    });
    QuestService.setBoardColumn(questId, column.id).catch(console.error);
  },

  completeQuest: (questId) => {
    const quest = get().quests.find((q) => q.id === questId);
    if (!quest || quest.status === "Completed") return;
    const questSubtasks = get().subtasks.filter((subtask) => subtask.questId === questId);
    if (questSubtasks.some((subtask) => !subtask.completed)) return;
    const completedColumn = useSettingsStore
      .getState()
      .settings?.boardColumns.find((column) => column.status === "Completed");

    set((state) => ({
      quests: state.quests.map((q) =>
        q.id === questId
          ? {
              ...q,
              status: "Completed" as QuestStatus,
              boardColumnId: completedColumn?.id ?? q.boardColumnId,
              showInOverlay: false,
              completionPercentage: 100,
              updatedDate: now(),
            }
          : q
      ),
    }));
    if (completedColumn) QuestService.setBoardColumn(questId, completedColumn.id).catch(console.error);

    // Subtask XP and completion stats were already awarded when the final
    // subtask was checked. Only quests without subtasks need a manual award.
    if (questSubtasks.length === 0) {
      useUserStore.getState().addXp(quest.xpReward);
      useUserStore.getState().incrementCompletedQuests();
      useUserStore.getState().incrementDailyCompletedTasks();
    }
  },

  moveQuestToStatus: (questId, columnId) => {
    const column = useSettingsStore.getState().settings?.boardColumns.find((item) => item.id === columnId);
    if (!column) return;
    const state = get();
    const quest = state.quests.find((q) => q.id === questId);
    if (!quest || quest.boardColumnId === columnId) return;

    const hasIncompleteSubtasks =
      column.status === "Completed" &&
      state.subtasks.some((s) => s.questId === questId) &&
      quest.completionPercentage < 100;
    if (hasIncompleteSubtasks) return;

    set((current) => {
      // A manual board move is authoritative. Recomputing here would
      // immediately move a fully completed quest back to Completed.
      const quests = current.quests.map((q) =>
        q.id === questId
          ? {
              ...q,
              status: column.status,
              boardColumnId: columnId,
              ...(column.status === "Archived" && { showInOverlay: false }),
              updatedDate: now(),
            }
          : q
      );
      return { quests };
    });

    QuestService.setBoardColumn(questId, columnId).catch(console.error);
  },

  toggleOverlayPinned: (questId, pinned) => {
    const state = get();
    const quest = state.quests.find((item) => item.id === questId);
    if (!quest || (pinned && !quest.showInOverlay && state.quests.filter((item) => item.showInOverlay).length >= MAX_OVERLAY_QUESTS)) {
      return false;
    }
    set((state) => ({
      quests: state.quests.map((q) => (q.id === questId ? { ...q, showInOverlay: pinned } : q)),
    }));
    QuestService.setOverlayPinned(questId, pinned).catch(console.error);
    return true;
  },

  toggleSubtask: (subtaskId) => {
    const state = get();
    const subtask = state.subtasks.find((s) => s.id === subtaskId);
    if (!subtask) return;

    const quest = state.quests.find((q) => q.id === subtask.questId);
    const willBeCompleted = !subtask.completed;

    const orderedSubtasks = state.subtasks
      .filter((s) => s.questId === subtask.questId)
      .sort((a, b) => a.order - b.order);
    const baseShare = quest ? xpShareForSubtask(quest, orderedSubtasks, subtaskId) : 0;

    // Checking a task off awards its XP share (with a combo bonus for rapid
    // completions); unchecking it un-awards the same base share.
    let xpDelta = 0;
    let comboCount = 1;
    if (willBeCompleted) {
      const combo = useComboStore.getState().registerCompletion();
      comboCount = combo.comboCount;
      const bonus = Math.round(baseShare * (combo.multiplier - 1));
      xpDelta = baseShare + bonus;
    } else {
      xpDelta = -baseShare;
    }

    set((s) => {
      const subtasks = s.subtasks.map((st) =>
        st.id === subtaskId ? { ...st, completed: willBeCompleted } : st
      );
      const completedColumn = useSettingsStore
        .getState()
        .settings?.boardColumns.find((column) => column.status === "Completed");
      const activeColumn = useSettingsStore
        .getState()
        .settings?.boardColumns.find((column) => column.status === "Active");
      const quests = recomputeAll(s.quests, subtasks, true).map((item) => {
        if (item.id !== quest?.id) return item;
        if (item.status === "Completed" && completedColumn) {
          return { ...item, boardColumnId: completedColumn.id, showInOverlay: false };
        }
        if (item.status === "Active" && quest.status === "Completed" && activeColumn) {
          return { ...item, boardColumnId: activeColumn.id };
        }
        return item;
      });
      const lastXpEvents =
        xpDelta !== 0
          ? { ...s.lastXpEvents, [subtaskId]: { amount: xpDelta, comboCount, nonce: Date.now() } }
          : s.lastXpEvents;

      return { subtasks, quests, lastXpEvents };
    });
    QuestService.toggleSubtask(subtaskId).catch(console.error);
    const updatedQuest = get().quests.find((item) => item.id === quest?.id);
    if (updatedQuest && quest && updatedQuest.boardColumnId !== quest.boardColumnId) {
      QuestService.setBoardColumn(updatedQuest.id, updatedQuest.boardColumnId).catch(console.error);
    }

    if (xpDelta !== 0) {
      useUserStore.getState().addXp(xpDelta);
    }
    if (willBeCompleted) {
      useUserStore.getState().incrementDailyCompletedTasks();
    }

    // If this was the subtask that pushed the quest to 100%, count the quest
    // completion too (subtask shares already summed to the full XP reward).
    if (quest && quest.status !== "Completed") {
      const updatedQuest = get().quests.find((q) => q.id === quest.id);
      if (updatedQuest?.status === "Completed") {
        useUserStore.getState().incrementCompletedQuests();
      }
    }
  },

  addSubtask: (questId, title) => {
    let newSubtaskOrder = 0;
    set((state) => {
      const questSubtasks = state.subtasks.filter((s) => s.questId === questId);
      newSubtaskOrder = questSubtasks.length;
      const newSubtask: Subtask = {
        id: `pending-subtask-${Date.now()}`,
        questId,
        title,
        completed: false,
        order: newSubtaskOrder,
      };
      const subtasks = [...state.subtasks, newSubtask];
      return { subtasks, quests: recomputeAll(state.quests, subtasks) };
    });
    QuestService.addSubtask(questId, title, newSubtaskOrder).catch(console.error);
  },

  removeSubtask: (subtaskId) => {
    set((state) => {
      const subtasks = state.subtasks.filter((s) => s.id !== subtaskId);
      return { subtasks, quests: recomputeAll(state.quests, subtasks) };
    });
    QuestService.removeSubtask(subtaskId).catch(console.error);
  },

  reorderSubtasks: (questId, orderedSubtaskIds) => {
    set((state) => {
      const subtasks = state.subtasks.map((s) => {
        if (s.questId !== questId) return s;
        const newOrder = orderedSubtaskIds.indexOf(s.id);
        return newOrder === -1 ? s : { ...s, order: newOrder };
      });
      return { subtasks };
    });
    QuestService.reorderSubtasks(questId, orderedSubtaskIds).catch(console.error);
  },

  clearXpEvent: (subtaskId) =>
    set((s) => {
      if (!(subtaskId in s.lastXpEvents)) return s;
      const lastXpEvents = { ...s.lastXpEvents };
      delete lastXpEvents[subtaskId];
      return { lastXpEvents };
    }),
}));
