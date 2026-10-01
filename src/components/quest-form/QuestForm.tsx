import { useState, type FormEvent } from "react";
import type { Difficulty, Priority, Quest, Subtask } from "../../types";
import type { QuestFormInput } from "../../store/questStore";
import { DifficultySelect } from "./DifficultySelect";
import { PrioritySelect } from "./PrioritySelect";
import { SubtaskEditor, type SubtaskDraft } from "./SubtaskEditor";
import { useTranslation } from "../../i18n";

interface QuestFormProps {
  /** Present when editing an existing quest; absent when creating a new one. */
  initialQuest?: Quest;
  initialSubtasks?: Subtask[];
  onSubmit: (input: QuestFormInput) => void;
  onCancel: () => void;
}

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

/** Create/edit form for a Quest, including its subtasks. XP is always derived from difficulty. */
export function QuestForm({ initialQuest, initialSubtasks, onSubmit, onCancel }: QuestFormProps): JSX.Element {
  const t = useTranslation();
  const [title, setTitle] = useState(initialQuest?.title ?? "");
  const [description, setDescription] = useState(initialQuest?.description ?? "");
  const [priority, setPriority] = useState<Priority>(initialQuest?.priority ?? "Medium");
  const [difficulty, setDifficulty] = useState<Difficulty>(initialQuest?.difficulty ?? "Medium");
  const [category, setCategory] = useState(initialQuest?.category ?? "");
  const [dueDate, setDueDate] = useState(toDateInputValue(initialQuest?.dueDate ?? null));
  const [subtasks, setSubtasks] = useState<SubtaskDraft[]>(
    (initialSubtasks ?? []).map((s) => ({ key: s.id, title: s.title }))
  );
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError(t("questNameRequired"));
      return;
    }
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      priority,
      difficulty,
      category: category.trim() || "General",
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      subtaskTitles: subtasks.map((s) => s.title),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto pr-1">
      <div>
        <label className="mb-1 block text-xs font-medium text-white/60">{t("questName")}</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("questNamePlaceholder")}
          className="w-full rounded-lg border border-hud-border bg-hud-bg px-3 py-1.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-sky-400/60"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-white/60">{t("description")}</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder={t("descriptionPlaceholder")}
          className="w-full resize-none rounded-lg border border-hud-border bg-hud-bg px-3 py-1.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-sky-400/60"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-white/60">{t("difficultyLabel")}</label>
          <DifficultySelect value={difficulty} onChange={setDifficulty} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-white/60">{t("priority")}</label>
          <PrioritySelect value={priority} onChange={setPriority} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-white/60">{t("category")}</label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder={t("categoryPlaceholder")}
            className="w-full rounded-lg border border-hud-border bg-hud-bg px-3 py-1.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-sky-400/60"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-white/60">{t("dueDate")}</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-lg border border-hud-border bg-hud-bg px-3 py-1.5 text-sm text-white outline-none focus:border-sky-400/60"
          />
        </div>
      </div>

      <SubtaskEditor subtasks={subtasks} onChange={setSubtasks} />

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="mt-1 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-white/70 hover:bg-white/10"
        >
          {t("cancel")}
        </button>
        <button
          type="submit"
          className="rounded-lg bg-sky-400/90 px-4 py-1.5 text-sm font-semibold text-black hover:bg-sky-300"
        >
          {t("save")}
        </button>
      </div>
    </form>
  );
}
