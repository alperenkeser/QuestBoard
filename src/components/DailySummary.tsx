import { useUserStore } from "../store/userStore";
import { getLevelProgress } from "../services/leveling";

/** Daily Summary: Completed Quests, Completed Tasks, Earned XP, Level Progress — all reset at day rollover. */
export function DailySummary(): JSX.Element | null {
  const user = useUserStore((s) => s.user);
  if (!user) return null;

  const progress = getLevelProgress(user.totalXp, user.level);

  const stats = [
    { label: "Quests Completed", value: user.dailyCompletedQuests },
    { label: "Tasks Completed", value: user.dailyCompletedTasks },
    { label: "XP Earned", value: `+${user.dailyEarnedXp}` },
    { label: "Level Progress", value: `${progress.progressPercent}%` },
  ];

  return (
    <div className="rounded-xl border border-hud-border bg-hud-bg p-4 backdrop-blur-xl">
      <h3 className="mb-3 text-sm font-semibold text-white/70">Today</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-white/5 bg-white/5 p-2 text-center">
            <div className="text-lg font-bold text-sky-300">{stat.value}</div>
            <div className="text-[11px] text-white/50">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
