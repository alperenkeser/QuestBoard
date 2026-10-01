import { useState } from "react";
import { useUserStore } from "../store/userStore";
import { getLevelProgress } from "../services/leveling";
import { ProgressBar } from "./ProgressBar";
import { useTranslation } from "../i18n";
import { LevelRoadmapModal } from "./LevelRoadmapModal";

/** Player Profile: Level, animated XP progress bar, Total XP, Completed Quests, Daily Completed Tasks. */
export function PlayerProfileBar(): JSX.Element | null {
  const user = useUserStore((s) => s.user);
  const [roadmapOpen, setRoadmapOpen] = useState(false);
  const t = useTranslation();
  if (!user) return null;

  const progress = getLevelProgress(user.totalXp, user.level);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-hud-border bg-hud-bg p-4 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRoadmapOpen(true)}
            title={t("openLevelRoadmap")}
            aria-label={`${t("openLevelRoadmap")}: Level ${progress.level}`}
            className="rounded-full border border-violet-300/40 bg-violet-400/20 px-2.5 py-0.5 text-sm font-bold text-violet-200 transition-colors hover:border-violet-200/70 hover:bg-violet-400/30 focus:outline-none focus:ring-2 focus:ring-violet-300/60"
          >
            Level {progress.level}
          </button>
          <span className="text-xs text-white/50">
            {progress.xpIntoLevel} / {progress.xpForNextLevel} XP
          </span>
        </div>
        <span className="text-sm font-semibold text-sky-300">{user.totalXp} Total XP</span>
      </div>

      <ProgressBar percentage={progress.progressPercent} />

      <div className="mt-1 flex gap-4 text-xs text-white/60">
        <span>
          <span className="font-semibold text-white/90">{user.completedQuests}</span> Completed Quests
        </span>
        <span>
          <span className="font-semibold text-white/90">{user.dailyCompletedTasks}</span> Tasks Today
        </span>
      </div>
      <LevelRoadmapModal
        open={roadmapOpen}
        level={user.level}
        totalXp={user.totalXp}
        onClose={() => setRoadmapOpen(false)}
      />
    </div>
  );
}
