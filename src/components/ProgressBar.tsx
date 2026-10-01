import { motion } from "framer-motion";

interface ProgressBarProps {
  percentage: number;
}

/**
 * Ultra-thin (3px) HUD-style progress bar. Width animates smoothly on change
 * so percentage jumps (e.g. 40% -> 60%) never appear instant.
 */
export function ProgressBar({ percentage }: ProgressBarProps): JSX.Element {
  const clamped = Math.max(0, Math.min(100, percentage));

  return (
    <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/10">
      <motion.div
        className="h-full rounded-full bg-gradient-to-r from-sky-400 to-violet-400"
        initial={false}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
    </div>
  );
}
