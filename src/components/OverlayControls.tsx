import { motion } from "framer-motion";
import { QuestBoardIcon } from "./QuestBoardIcon";

interface OverlayControlsProps {
  dragEnabled: boolean;
  collapsed: boolean;
  alwaysOnTop: boolean;
  showIconsOnHover: boolean;
  onToggleDrag: () => void;
  onToggleCollapsed: () => void;
  onToggleAlwaysOnTop: () => void;
  onClose: () => void;
  onOpenMain: () => void;
}

export function OverlayControls({
  dragEnabled,
  collapsed,
  alwaysOnTop,
  showIconsOnHover,
  onToggleDrag,
  onToggleCollapsed,
  onToggleAlwaysOnTop,
  onClose,
  onOpenMain,
}: OverlayControlsProps): JSX.Element {
  const buttonBase =
    "no-drag grid h-8 w-8 place-items-center rounded-md text-white/55 transition-colors hover:bg-white/10 hover:text-white active:scale-95 active:bg-white/15 active:text-white";
  const visibilityClass = showIconsOnHover
    ? "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100"
    : "pointer-events-auto opacity-100";

  return (
    <motion.div
      initial={{ y: -6 }}
      animate={{ y: 0 }}
      className={`flex w-full items-center justify-between gap-3 px-1 transition-opacity duration-150 ${visibilityClass}`}
    >
      <button
        type="button"
        onClick={onOpenMain}
        className={`${buttonBase} text-sky-100/85 hover:bg-sky-300/15 hover:text-white`}
        title="Open QuestBoard"
        aria-label="Open QuestBoard"
      >
        <QuestBoardIcon className="h-5 w-5" />
      </button>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleDrag}
          className={`${buttonBase} ${dragEnabled ? "bg-white/10 text-white" : ""}`}
          title={dragEnabled ? "Taşıma açık (pin kapalı)" : "Taşıma kapalı (pin açık)"}
          aria-pressed={dragEnabled}
          aria-label={dragEnabled ? "Taşıma açık" : "Taşıma kapalı"}
        >
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 4v16M4 12h16" />
            <path d="m12 4-2 2m2-2 2 2M12 20l-2-2m2 2 2-2M4 12l2-2m-2 2 2 2m14-2-2-2m2 2-2 2" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onToggleAlwaysOnTop}
          className={`${buttonBase} ${alwaysOnTop ? "bg-white/10 text-white" : ""}`}
          title={alwaysOnTop ? "Always on top açık" : "Always on top kapalı"}
          aria-pressed={alwaysOnTop}
          aria-label={alwaysOnTop ? "Always on top açık" : "Always on top kapalı"}
        >
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M8 4h8l-1 5 3 3v2H6v-2l3-3-1-5Z" />
            <path d="M12 14v7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onToggleCollapsed}
          className={`${buttonBase} ${collapsed ? "text-sky-200 drop-shadow-[0_0_6px_rgba(56,189,248,0.65)]" : "active:text-sky-200"}`}
          aria-label={collapsed ? "Genişlet" : "Daralt"}
        >
          {collapsed ? (
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <rect x="4" y="4" width="16" height="16" rx="2" />
              <path d="M8 12h8" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M5 12h14" />
            </svg>
          )}
        </button>
        <button
          type="button"
          onClick={onClose}
          className={`${buttonBase} hover:text-red-200 active:text-red-300`}
          aria-label="Kapat"
        >
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}
