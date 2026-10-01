// Mirrors electron/repositories/UserRepository.ts's level curve. Duplicated
// (not imported) on purpose: electron/ (main process) and src/ (renderer)
// are separate build targets, so shared pure math is kept in sync manually
// rather than reaching across the process boundary.
const LEVEL_THRESHOLDS = [0, 1000, 2500, 5000, 9000];

export interface LevelProgress {
  level: number;
  /** XP earned since the start of the current level. */
  xpIntoLevel: number;
  /** XP required to go from the current level to the next one. */
  xpForNextLevel: number;
  /** 0-100, how far through the current level the player is. */
  progressPercent: number;
}

function levelFloorAndDelta(level: number): { floor: number; delta: number } {
  if (level <= LEVEL_THRESHOLDS.length) {
    const floor = LEVEL_THRESHOLDS[level - 1];
    const delta =
      level < LEVEL_THRESHOLDS.length
        ? LEVEL_THRESHOLDS[level] - LEVEL_THRESHOLDS[level - 1]
        : (LEVEL_THRESHOLDS[level - 1] - LEVEL_THRESHOLDS[level - 2]) * 1.5;
    return { floor, delta };
  }

  // Beyond the last defined threshold (level 5, 9000 XP), each level's XP
  // requirement grows by x1.5 over the previous one, forever.
  let floor = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  let delta =
    (LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] - LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 2]) *
    1.5;
  let curLevel = LEVEL_THRESHOLDS.length;
  while (curLevel < level) {
    floor += delta;
    curLevel += 1;
    delta *= 1.5;
  }
  return { floor, delta };
}

/** Returns the cumulative XP threshold needed to reach a level. */
export function getXpThresholdForLevel(level: number): number {
  if (!Number.isInteger(level) || level < 1) {
    throw new RangeError("Level must be a positive integer.");
  }
  return Math.ceil(levelFloorAndDelta(level).floor);
}

/** Computes how far a player is through their current level, for a progress bar. */
export function getLevelProgress(totalXp: number, level: number): LevelProgress {
  const { floor, delta } = levelFloorAndDelta(level);
  const currentThreshold = Math.ceil(floor);
  const nextThreshold = Math.ceil(levelFloorAndDelta(level + 1).floor);
  const xpIntoLevel = Math.max(0, totalXp - currentThreshold);
  const xpForNextLevel = nextThreshold - currentThreshold || Math.round(delta);
  const progressPercent = Math.max(
    0,
    Math.min(100, Math.round((xpIntoLevel / xpForNextLevel) * 100))
  );

  return { level, xpIntoLevel, xpForNextLevel, progressPercent };
}
