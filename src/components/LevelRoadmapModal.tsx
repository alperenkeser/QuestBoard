import type { TranslationKey } from "../i18n";
import { useTranslation } from "../i18n";
import { getLevelProgress, getXpThresholdForLevel } from "../services/leveling";
import { Modal } from "./Modal";
import { ProgressBar } from "./ProgressBar";

interface LevelRoadmapModalProps {
  open: boolean;
  level: number;
  totalXp: number;
  onClose: () => void;
}

const MILESTONES: Array<{ level: number; title: TranslationKey }> = [
  { level: 10, title: "milestone10" },
  { level: 25, title: "milestone25" },
  { level: 50, title: "milestone50" },
  { level: 100, title: "milestone100" },
];

export function LevelRoadmapModal({
  open,
  level,
  totalXp,
  onClose,
}: LevelRoadmapModalProps): JSX.Element {
  const t = useTranslation();
  const progress = getLevelProgress(totalXp, level);

  return (
    <Modal open={open} title={t("levelRoadmap")} onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-xl border border-violet-300/20 bg-violet-400/[0.08] p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-violet-100">
              Level {level}
            </span>
            <span className="text-xs text-white/65">
              {totalXp.toLocaleString()} XP
            </span>
          </div>
          <ProgressBar percentage={progress.progressPercent} />
          <p className="mt-2 text-[11px] text-white/55">
            {t("levelRoadmapHint")} · {progress.xpIntoLevel.toLocaleString()} /{" "}
            {progress.xpForNextLevel.toLocaleString()} XP
          </p>
        </div>

        <ol className="relative space-y-2 before:absolute before:bottom-5 before:left-[17px] before:top-5 before:w-px before:bg-white/10">
          {MILESTONES.map((milestone) => {
            const reached = level >= milestone.level;
            const xpThreshold = getXpThresholdForLevel(milestone.level);
            return (
              <li
                key={milestone.level}
                className={`relative flex items-center gap-3 rounded-xl border p-3 ${
                  reached
                    ? "border-emerald-300/25 bg-emerald-400/[0.07]"
                    : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <span
                  className={`z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full border text-xs font-bold ${
                    reached
                      ? "border-emerald-300/40 bg-emerald-400/20 text-emerald-200"
                      : "border-white/15 bg-[#17171d] text-white/50"
                  }`}
                >
                  {reached ? "✓" : milestone.level}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-white/90">
                    Level {milestone.level} · {t(milestone.title)}
                  </span>
                  <span className="mt-0.5 block text-xs text-white/50">
                    {t("xpRequired")}: {xpThreshold.toLocaleString()} XP
                  </span>
                </span>
                <span
                  className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide ${
                    reached ? "text-emerald-200" : "text-white/40"
                  }`}
                >
                  {reached ? t("milestoneReached") : t("milestoneUpcoming")}
                </span>
              </li>
            );
          })}
        </ol>

        <p className="text-center text-[11px] text-white/40">{t("localProgress")}</p>
      </div>
    </Modal>
  );
}
