import { useMemo } from "react";
import { motion } from "framer-motion";

interface OverlayCelebrationProps {
  onNewQuest: () => void;
}

export function OverlayCelebration({ onNewQuest }: OverlayCelebrationProps): JSX.Element {
  const particles = useMemo(
    () => {
      const colors = ["bg-amber-300", "bg-sky-300", "bg-fuchsia-300", "bg-emerald-300"];
      const origins = [
        { x: "20%", y: "44%" },
        { x: "50%", y: "34%" },
        { x: "80%", y: "44%" },
      ];
      return Array.from({ length: 48 }, (_, i) => {
        const burst = Math.floor(i / 16);
        const particle = i % 16;
        const angle = (particle / 16) * Math.PI * 2;
        const distance = 30 + (particle % 4) * 8;
        return {
          id: i,
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
          delay: burst * 0.72 + (particle % 4) * 0.025,
          color: colors[particle % colors.length],
          origin: origins[burst],
        };
      });
    },
    []
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="no-drag relative w-full overflow-hidden rounded-hud border border-hud-border bg-hud-bg p-4 text-center shadow-hud backdrop-blur-hud"
    >
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {particles.map((p) => (
          <motion.span
            key={p.id}
            className={`absolute h-2 w-2 rounded-full ${p.color}`}
            style={{ left: p.origin.x, top: p.origin.y }}
            initial={{ opacity: 0, x: 0, y: 0, scale: 0.6 }}
            animate={{
              opacity: [0, 1, 0],
              x: [0, p.x],
              y: [0, p.y],
              scale: [0.6, 1, 0.5],
            }}
            transition={{
              duration: 0.75,
              delay: p.delay,
              ease: "easeOut",
            }}
          />
        ))}
      </div>

      <p className="relative text-base font-bold text-emerald-200">🎉 Tebrikler!</p>
      <p className="relative mt-1 text-xs text-white/75">Tüm aktif görevleri tamamladın.</p>
      <button
        type="button"
        onClick={onNewQuest}
        className="relative mt-4 rounded-lg bg-sky-400/90 px-4 py-1.5 text-sm font-semibold text-black hover:bg-sky-300"
      >
        Yeni Görev Al
      </button>
    </motion.div>
  );
}
