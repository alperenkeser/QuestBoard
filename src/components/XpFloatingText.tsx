import { motion } from "framer-motion";

interface XpFloatingTextProps {
  amount: number;
}

/**
 * "+100 XP" (or "-50 XP" when a completion is undone) that floats upward and
 * fades out. Purely presentational — callers own the mount/unmount timing.
 */
export function XpFloatingText({ amount }: XpFloatingTextProps): JSX.Element {
  const positive = amount >= 0;

  return (
    <motion.span
      initial={{ opacity: 0, y: 0, scale: 0.9 }}
      animate={{ opacity: [0, 1, 1, 0], y: -28, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.9, ease: "easeOut" }}
      className={`pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-bold ${
        positive ? "text-emerald-300" : "text-red-300"
      }`}
    >
      {positive ? "+" : ""}
      {amount} XP
    </motion.span>
  );
}
