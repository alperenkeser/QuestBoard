import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Quest } from "../types";
import { useQuestStore, type QuestFormInput } from "../store/questStore";
import { sortQuests } from "../services/questSort";
import { SearchBar } from "../components/SearchBar";
import { SortControl, type SortKey } from "../components/SortControl";
import { ManagerQuestCard } from "../components/ManagerQuestCard";
import { Modal } from "../components/Modal";
import { QuestForm } from "../components/quest-form/QuestForm";
import { PlayerProfileBar } from "../components/PlayerProfileBar";
import { DailySummary } from "../components/DailySummary";
import { ComboBadge } from "../components/ComboBadge";
import { SettingsPage } from "./SettingsPage";
import { useSettingsStore } from "../store/settingsStore";
import { MAX_OVERLAY_QUESTS } from "../store/overlayStore";
import { useTranslation } from "../i18n";
import { QuestBoardIcon } from "../components/QuestBoardIcon";
import { SprintBoardView } from "../components/SprintBoardView";

type ManagerView = "quests" | "sprints" | "settings";

export function QuestManager(): JSX.Element {
  const quests = useQuestStore((s) => s.quests);
  const subtasksForQuest = useQuestStore((s) => s.subtasksForQuest);
  const toggleSubtask = useQuestStore((s) => s.toggleSubtask);
  const createQuest = useQuestStore((s) => s.createQuest);
  const updateQuest = useQuestStore((s) => s.updateQuest);
  const deleteQuest = useQuestStore((s) => s.deleteQuest);
  const archiveQuest = useQuestStore((s) => s.archiveQuest);
  const restoreQuest = useQuestStore((s) => s.restoreQuest);
  const completeQuest = useQuestStore((s) => s.completeQuest);
  const moveQuestToStatus = useQuestStore((s) => s.moveQuestToStatus);
  const toggleOverlayPinned = useQuestStore((s) => s.toggleOverlayPinned);
  const lastXpEvents = useQuestStore((s) => s.lastXpEvents);
  const clearXpEvent = useQuestStore((s) => s.clearXpEvent);
  const settings = useSettingsStore((s) => s.settings);
  const t = useTranslation();

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("priority");
  const [view, setView] = useState<ManagerView>("quests");
  const [formOpen, setFormOpen] = useState(false);
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
  const [draggingQuestId, setDraggingQuestId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [requestedSprintBoardId, setRequestedSprintBoardId] = useState("");
  const normalQuests = useMemo(() => quests.filter((quest) => quest.azureSprintBoardId === null), [quests]);
  const sprintLabel = settings?.language === "tr" ? "Sprint Board" : "Sprint boards";

  useEffect(() => {
    const handleSprintBoardSelected = (event: Event) => {
      const boardId = (event as CustomEvent<string>).detail;
      if (typeof boardId === "string") {
        setRequestedSprintBoardId(boardId);
        setView("sprints");
      }
    };
    window.addEventListener("azure-sprint-board-selected", handleSprintBoardSelected);
    return () => window.removeEventListener("azure-sprint-board-selected", handleSprintBoardSelected);
  }, []);

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return normalQuests;
    return normalQuests.filter(
      (quest) =>
        quest.title.toLowerCase().includes(q) || quest.description.toLowerCase().includes(q)
    );
  }, [normalQuests, search]);

  function openCreateForm() {
    setEditingQuest(null);
    setFormOpen(true);
  }

  function openEditForm(quest: Quest) {
    setEditingQuest(quest);
    setFormOpen(true);
  }

  function handleFormSubmit(input: QuestFormInput) {
    if (editingQuest) {
      updateQuest(editingQuest.id, input);
    } else {
      createQuest(input);
    }
    setFormOpen(false);
    setEditingQuest(null);
  }

  function handleDrop(columnId: string) {
    if (!draggingQuestId) return;
    moveQuestToStatus(draggingQuestId, columnId);
    setDraggingQuestId(null);
    setDropTarget(null);
  }

  const boardColumns = settings?.boardColumns ?? [];
  const overlayQuestCount = quests.filter((quest) => quest.showInOverlay).length;
  const canPinToOverlay = overlayQuestCount < MAX_OVERLAY_QUESTS;

  return (
    <div
      className="mx-auto flex h-full w-full max-w-[1600px] flex-col gap-4 p-6"
      style={{ backgroundColor: "var(--qb-main-bg-a)" }}
    >
      <div className="flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-xl font-bold text-white">
          <QuestBoardIcon className="h-7 w-7" />
          {t("questManager")}
        </h1>
        <div className="flex items-center gap-3">
          <ComboBadge />
          <button
            type="button"
            onClick={() => window.questboard.window.focusOverlay().catch(console.error)}
            title={`${overlayQuestCount}/${MAX_OVERLAY_QUESTS} ${t("widget")}`}
            className="rounded-lg border border-hud-border bg-hud-bg px-3 py-1.5 text-sm font-semibold text-white/85 hover:bg-white/15"
          >
            {t("widget")} ({overlayQuestCount}/{MAX_OVERLAY_QUESTS})
          </button>
          <button
            type="button"
            onClick={openCreateForm}
            className="rounded-lg bg-sky-400/90 px-4 py-1.5 text-sm font-semibold text-black hover:bg-sky-300"
          >
            {t("newQuest")}
          </button>
        </div>
      </div>

      <div className="flex gap-1 self-start rounded-lg border border-hud-border bg-hud-bg p-1">
        <button
          type="button"
          onClick={() => setView("quests")}
          className={`relative rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            view === "quests" ? "text-sky-200" : "text-white/65 hover:text-white"
          }`}
        >
          {view === "quests" && (
            <motion.span
              layoutId="manager-nav-pill"
              className="absolute inset-0 rounded-md bg-sky-400/20"
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
            />
          )}
          <span className="relative">{t("quests")}</span>
        </button>
        <button
          type="button"
          onClick={() => setView("sprints")}
          className={`relative rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            view === "sprints" ? "text-sky-200" : "text-white/65 hover:text-white"
          }`}
        >
          {view === "sprints" && (
            <motion.span
              layoutId="manager-nav-pill"
              className="absolute inset-0 rounded-md bg-sky-400/20"
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
            />
          )}
          <span className="relative">{sprintLabel}</span>
        </button>
        <button
          type="button"
          onClick={() => setView("settings")}
          className={`relative rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            view === "settings" ? "text-sky-200" : "text-white/65 hover:text-white"
          }`}
        >
          {view === "settings" && (
            <motion.span
              layoutId="manager-nav-pill"
              className="absolute inset-0 rounded-md bg-sky-400/20"
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
            />
          )}
          <span className="relative">{t("settings")}</span>
        </button>
      </div>

      <PlayerProfileBar />
      <DailySummary />

      <AnimatePresence mode="wait" initial={false}>
        {view === "quests" ? (
          <motion.div
            key="quests-view"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex flex-1 flex-col"
          >
            <div className="flex flex-wrap items-center gap-3">
              <SearchBar value={search} onChange={setSearch} />
              <SortControl sortKey={sortKey} onChange={setSortKey} />
            </div>

            <motion.div
              className="mt-4 grid flex-1 gap-4 overflow-auto pb-6"
              style={{
                gridTemplateColumns: `repeat(${Math.max(boardColumns.length, 1)}, minmax(260px, 1fr))`,
              }}
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { staggerChildren: 0.06 } },
              }}
            >
              {boardColumns.map((column) => {
                const columnTone =
                  column.status === "Archived"
                    ? "border-slate-400/25 bg-[#191d26]"
                    : column.status === "Active"
                      ? "border-blue-400/30 bg-[#111e30]"
                      : "border-green-400/30 bg-[#10231e]";
                const headingTone =
                  column.status === "Archived"
                    ? "text-slate-200/80"
                    : column.status === "Active"
                      ? "text-blue-200"
                      : "text-green-200";
                const sectionQuests = sortQuests(
                  searched.filter((q) => q.boardColumnId === column.id),
                  sortKey
                );

                return (
                  <motion.section
                    key={column.id}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDropTarget(column.id);
                    }}
                    onDragLeave={() => setDropTarget((prev) => (prev === column.id ? null : prev))}
                    onDrop={() => handleDrop(column.id)}
                    className={`min-w-0 rounded-xl border p-3 transition-colors ${
                      dropTarget === column.id
                        ? "border-sky-300/60 bg-[#17243a]"
                        : columnTone
                    }`}
                    variants={{
                      hidden: { opacity: 0, y: 8 },
                      show: { opacity: 1, y: 0 },
                    }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    <h2 className={`mb-2 text-sm font-semibold uppercase tracking-wide ${headingTone}`}>
                      {column.title} ({sectionQuests.length})
                    </h2>
                    {sectionQuests.length === 0 ? (
                      <p className="text-sm text-white/30">{t("noQuests")}</p>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {sectionQuests.map((quest) => (
                          <div
                            key={quest.id}
                            draggable
                            onDragStart={() => setDraggingQuestId(quest.id)}
                            onDragEnd={() => {
                              setDraggingQuestId(null);
                              setDropTarget(null);
                            }}
                            className={`cursor-grab active:cursor-grabbing ${draggingQuestId === quest.id ? "opacity-70" : ""}`}
                          >
                            <ManagerQuestCard
                              quest={quest}
                              subtasks={subtasksForQuest(quest.id)}
                              onToggleSubtask={toggleSubtask}
                              onEdit={openEditForm}
                              onDelete={deleteQuest}
                              onArchive={archiveQuest}
                              onRestore={restoreQuest}
                              onComplete={completeQuest}
                              onToggleOverlayPinned={toggleOverlayPinned}
                              canPinToOverlay={canPinToOverlay}
                              xpEvents={lastXpEvents}
                              onXpEventConsumed={clearXpEvent}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.section>
                );
              })}
            </motion.div>
          </motion.div>
        ) : view === "sprints" ? (
          <motion.div
            key="sprints-view"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-6"
          >
            <SprintBoardView requestedBoardId={requestedSprintBoardId} />
          </motion.div>
        ) : (
          <motion.div
            key="settings-view"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex-1 overflow-y-auto pb-6"
          >
            <SettingsPage />
          </motion.div>
        )}
      </AnimatePresence>

      <Modal
        open={formOpen}
        title={editingQuest ? t("editQuest") : t("newQuest").replace(/^\+\s*/, "")}
        onClose={() => setFormOpen(false)}
      >
        <QuestForm
          initialQuest={editingQuest ?? undefined}
          initialSubtasks={editingQuest ? subtasksForQuest(editingQuest.id) : undefined}
          onSubmit={handleFormSubmit}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>
    </div>
  );
}
