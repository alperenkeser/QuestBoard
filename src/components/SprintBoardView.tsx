import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useQuestStore, type QuestFormInput } from "../store/questStore";
import type { Quest } from "../types";
import { useSettingsStore } from "../store/settingsStore";
import { MAX_OVERLAY_QUESTS } from "../store/overlayStore";
import { SearchBar } from "./SearchBar";
import { SortControl, type SortKey } from "./SortControl";
import { ManagerQuestCard } from "./ManagerQuestCard";
import type { AzureSprintBoardDto } from "../types/bridge";
import { sortQuests } from "../services/questSort";
import { useTranslation } from "../i18n";
import { Modal } from "./Modal";
import { QuestForm } from "./quest-form/QuestForm";
import { AzureDevOpsPanel } from "./AzureDevOpsPanel";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "An unexpected error occurred.";
}

export function SprintBoardView({ requestedBoardId }: { requestedBoardId: string }): JSX.Element {
  const quests = useQuestStore((state) => state.quests);
  const subtasksForQuest = useQuestStore((state) => state.subtasksForQuest);
  const storeActions = useQuestStore((state) => state);
  const settings = useSettingsStore((state) => state.settings);
  const t = useTranslation();
  const isTurkish = settings?.language === "tr";
  const [boards, setBoards] = useState<AzureSprintBoardDto[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("priority");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draggingQuestId, setDraggingQuestId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
  const [azureConnectOpen, setAzureConnectOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const loadBoards = async () => {
      try {
        const storedBoards = await window.questboard.db.azureDevOps.getSprintBoards();
        if (!active) return;
        setBoards(storedBoards);
        setSelectedBoardId((current) => {
          if (storedBoards.some((board) => board.id === current)) return current;
          return (
            storedBoards.find((board) => board.timeFrame === "current")?.id ??
            storedBoards[0]?.id ??
            ""
          );
        });
        setError("");
      } catch (loadError) {
        if (active) setError(getErrorMessage(loadError));
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadBoards();
    const unsubscribe = window.questboard.onDbChanged(() => void loadBoards());
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (requestedBoardId && boards.some((board) => board.id === requestedBoardId)) {
      setSelectedBoardId(requestedBoardId);
    }
  }, [requestedBoardId, boards]);

  const selectedBoard = boards.find((board) => board.id === selectedBoardId);
  const sprintQuests = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return sortQuests(
      quests.filter(
        (quest) =>
          quest.azureSprintBoardId === selectedBoardId &&
          (!query ||
            quest.title.toLocaleLowerCase().includes(query) ||
            quest.description.toLocaleLowerCase().includes(query))
      ),
      sortKey
    );
  }, [quests, selectedBoardId, search, sortKey]);
  const boardColumns = settings?.boardColumns ?? [];
  const overlayQuestCount = quests.filter((quest) => quest.showInOverlay).length;
  const canPinToOverlay = overlayQuestCount < MAX_OVERLAY_QUESTS;

  const copy = isTurkish
    ? {
        title: "Sprint Board",
        loading: "Sprint board'ları yükleniyor...",
        empty: "Henüz Sprint Board yok. Azure DevOps ayarlarından bağlantıyı deneyin.",
        select: "Sprint seçin",
        noQuests: "Bu sprintte görev yok.",
        synced: "Son eşitleme",
        connectAzure: "Azure'a bağlan",
        connectTitle: "Azure DevOps bağlantısı",
      }
    : {
        title: "Sprint Board",
        loading: "Loading sprint boards...",
        empty: "No Sprint Boards yet. Connect from Azure DevOps settings.",
        select: "Select a sprint",
        noQuests: "No tasks in this sprint.",
        synced: "Last synchronized",
        connectAzure: "Connect Azure",
        connectTitle: "Connect to Azure DevOps",
      };

  function handleDrop(columnId: string) {
    if (!draggingQuestId) return;
    storeActions.moveQuestToStatus(draggingQuestId, columnId);
    setDraggingQuestId(null);
    setDropTarget(null);
  }

  function handleQuestEdit(input: QuestFormInput) {
    if (!editingQuest) return;
    storeActions.updateQuest(editingQuest.id, input);
    setEditingQuest(null);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">{copy.title}</h2>
          {selectedBoard?.lastSyncedDate && (
            <p className="mt-1 text-xs text-white/45">
              {copy.synced}:{" "}
              {new Date(selectedBoard.lastSyncedDate).toLocaleString(isTurkish ? "tr-TR" : "en-US")}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <button
            type="button"
            onClick={() => setAzureConnectOpen(true)}
            className="rounded-lg border border-sky-300/25 bg-sky-400/10 px-3 py-2 text-sm font-semibold text-sky-100 hover:bg-sky-400/20"
          >
            {copy.connectAzure}
          </button>
          {boards.length > 0 && (
          <label className="min-w-64 text-xs font-medium text-white/65">
            {copy.select}
            <select
              value={selectedBoardId}
              onChange={(event) => setSelectedBoardId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-hud-border bg-hud-bg px-3 py-2 text-sm text-white outline-none focus:border-sky-400/60"
            >
              {boards.map((board) => (
                <option key={board.id} value={board.id}>
                  {board.name}
                </option>
              ))}
            </select>
          </label>
          )}
        </div>
      </div>

      {loading ? (
        <p role="status" className="mt-4 rounded-xl border border-hud-border bg-hud-bg p-5 text-sm text-white/55">
          {copy.loading}
        </p>
      ) : error ? (
        <p role="alert" className="mt-4 rounded-xl border border-rose-300/20 bg-rose-400/10 p-4 text-sm text-rose-200">
          {error}
        </p>
      ) : !selectedBoard ? (
        <p className="mt-4 rounded-xl border border-hud-border bg-hud-bg p-5 text-sm text-white/55">
          {copy.empty}
        </p>
      ) : (
        <>
          <p className="mt-2 break-all text-xs text-white/40">{selectedBoard.path}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <SearchBar value={search} onChange={setSearch} />
            <SortControl sortKey={sortKey} onChange={setSortKey} />
          </div>
          <motion.div
            className="mt-4 grid min-h-0 flex-1 gap-4 overflow-auto pb-6"
            style={{
              gridTemplateColumns: `repeat(${Math.max(boardColumns.length, 1)}, minmax(260px, 1fr))`,
            }}
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { staggerChildren: 0.04 } },
            }}
          >
            {boardColumns.map((column) => {
              const tone =
                column.status === "Archived"
                  ? "border-slate-400/25 bg-[#191d26]"
                  : column.status === "Completed"
                    ? "border-green-400/30 bg-[#10231e]"
                    : "border-blue-400/30 bg-[#111e30]";
              const heading =
                column.status === "Archived"
                  ? "text-slate-200/80"
                  : column.status === "Completed"
                    ? "text-green-200"
                    : "text-blue-200";
              const columnQuests = sprintQuests.filter((quest) => quest.boardColumnId === column.id);
              return (
                <motion.section
                  key={column.id}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDropTarget(column.id);
                  }}
                  onDragLeave={() => setDropTarget((previous) => (previous === column.id ? null : previous))}
                  onDrop={() => handleDrop(column.id)}
                  className={`min-w-0 rounded-xl border p-3 transition-colors ${
                    dropTarget === column.id ? "border-sky-300/60 bg-[#17243a]" : tone
                  }`}
                  variants={{
                    hidden: { opacity: 0, y: 8 },
                    show: { opacity: 1, y: 0 },
                  }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <h3 className={`mb-2 text-sm font-semibold uppercase tracking-wide ${heading}`}>
                    {column.title} ({columnQuests.length})
                  </h3>
                  {columnQuests.length === 0 ? (
                    <p className="text-sm text-white/30">{copy.noQuests}</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {columnQuests.map((quest) => (
                        <div
                          key={quest.id}
                          draggable
                          onDragStart={() => setDraggingQuestId(quest.id)}
                          onDragEnd={() => {
                            setDraggingQuestId(null);
                            setDropTarget(null);
                          }}
                          className={`cursor-grab active:cursor-grabbing ${
                            draggingQuestId === quest.id ? "opacity-70" : ""
                          }`}
                        >
                          <ManagerQuestCard
                            quest={quest}
                            subtasks={subtasksForQuest(quest.id)}
                            onToggleSubtask={storeActions.toggleSubtask}
                            onEdit={setEditingQuest}
                            onDelete={storeActions.deleteQuest}
                            onArchive={storeActions.archiveQuest}
                            onRestore={storeActions.restoreQuest}
                            onComplete={storeActions.completeQuest}
                            onToggleOverlayPinned={storeActions.toggleOverlayPinned}
                            canPinToOverlay={canPinToOverlay}
                            xpEvents={storeActions.lastXpEvents}
                            onXpEventConsumed={storeActions.clearXpEvent}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </motion.section>
              );
            })}
          </motion.div>
        </>
      )}
      <Modal
        open={Boolean(editingQuest)}
        title={t("editQuest")}
        onClose={() => setEditingQuest(null)}
      >
        {editingQuest && (
          <QuestForm
            initialQuest={editingQuest}
            initialSubtasks={subtasksForQuest(editingQuest.id)}
            onSubmit={handleQuestEdit}
            onCancel={() => setEditingQuest(null)}
          />
        )}
      </Modal>
      <Modal
        open={azureConnectOpen}
        title={copy.connectTitle}
        onClose={() => setAzureConnectOpen(false)}
        wide
      >
        <AzureDevOpsPanel onImported={() => setAzureConnectOpen(false)} />
      </Modal>
    </div>
  );
}
