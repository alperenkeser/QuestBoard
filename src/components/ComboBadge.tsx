import { AnimatePresence, motion } from "framer-motion";
import { useComboStore } from "../store/comboStore";

/** Shows "Combo x2/x3/x4" while the player is completing subtasks in rapid succession. */
export function ComboBadge(): JSX.Element {
  const comboCount = useComboStore((s) => s.comboCount);
  const visible = comboCount >= 2;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={comboCount}
          initial={{ opacity: 0, scale: 0.7, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.7 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="rounded-full border border-amber-300/40 bg-amber-400/20 px-3 py-1 text-xs font-bold text-amber-200"
        >
          Combo x{comboCount}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
