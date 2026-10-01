import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "../../i18n";

export interface SubtaskDraft {
  /** Stable key for React/drag-drop; not necessarily a persisted subtask id. */
  key: string;
  title: string;
}

interface SubtaskEditorProps {
  subtasks: SubtaskDraft[];
  onChange: (subtasks: SubtaskDraft[]) => void;
}

/** Add / remove / drag-and-drop reorder subtasks while editing a quest. */
export function SubtaskEditor({ subtasks, onChange }: SubtaskEditorProps): JSX.Element {
  const t = useTranslation();
  const [draft, setDraft] = useState("");
  const [dragKey, setDragKey] = useState<string | null>(null);

  function addSubtask() {
    const title = draft.trim();
    if (!title) return;
    onChange([...subtasks, { key: crypto.randomUUID(), title }]);
    setDraft("");
  }

  function removeSubtask(key: string) {
    onChange(subtasks.filter((s) => s.key !== key));
  }

  function handleDrop(targetKey: string) {
    if (!dragKey || dragKey === targetKey) return;
    const fromIndex = subtasks.findIndex((s) => s.key === dragKey);
    const toIndex = subtasks.findIndex((s) => s.key === targetKey);
    if (fromIndex === -1 || toIndex === -1) return;

    const next = [...subtasks];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    onChange(next);
    setDragKey(null);
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-white/60">{t("subtasksLabel")}</label>

      <div className="flex flex-col gap-1">
        <AnimatePresence>
          {subtasks.map((subtask) => (
            <motion.div
              key={subtask.key}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              draggable
              onDragStart={() => setDragKey(subtask.key)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(subtask.key)}
              className="flex cursor-grab items-center gap-2 rounded-md border border-hud-border bg-hud-bg px-2 py-1.5 text-sm text-white active:cursor-grabbing"
            >
              <span className="text-white/40" aria-hidden>
                ⠿
              </span>
              <span className="flex-1 truncate">{subtask.title}</span>
              <button
                type="button"
                onClick={() => removeSubtask(subtask.key)}
                className="rounded px-1.5 text-white/50 hover:bg-white/10 hover:text-red-300"
                aria-label={`${t("delete")} ${subtask.title}`}
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="mt-2 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addSubtask();
            }
          }}
          placeholder={t("newSubtask")}
          className="flex-1 rounded-lg border border-hud-border bg-hud-bg px-3 py-1.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-sky-400/60"
        />
        <button
          type="button"
          onClick={addSubtask}
          className="rounded-lg bg-sky-400/20 px-3 py-1.5 text-sm font-medium text-sky-300 hover:bg-sky-400/30"
        >
          {t("addSubtask")}
        </button>
      </div>
    </div>
  );
}
