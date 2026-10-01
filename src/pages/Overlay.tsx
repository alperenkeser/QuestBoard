import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { useQuestStore } from "../store/questStore";
import { useOverlayStore } from "../store/overlayStore";
import { useSettingsStore } from "../store/settingsStore";
import type { OverlayAnchor } from "../types";
import { QuestCard } from "../components/QuestCard";
import { ComboBadge } from "../components/ComboBadge";
import { AnimatePresence, motion } from "framer-motion";
import { OverlayControls } from "../components/OverlayControls";
import { OverlayCelebration } from "../components/OverlayCelebration";

/**
 * Quest HUD Overlay: always-on-top, top-right, transparent, glassmorphic,
 * draggable window content. Shows at most `maxVisibleQuests` active quests,
 * highest priority first.
 */
const OVERLAY_WIDTH = 340;
const OVERLAY_HEIGHT = 760;
const OVERLAY_MARGIN = 16;
const SNAP_THRESHOLD = 72;

const SNAP_ANCHORS: OverlayAnchor[] = [
  "right-top",
  "right-middle",
  "right-bottom",
  "left-top",
  "left-middle",
  "left-bottom",
];

function getSnapPoints(): Record<OverlayAnchor, { x: number; y: number }> {
  const sw = window.screen.availWidth;
  const sh = window.screen.availHeight;
  const height = Math.min(OVERLAY_HEIGHT, sh - OVERLAY_MARGIN * 2);
  const rightX = sw - OVERLAY_WIDTH - OVERLAY_MARGIN;
  const leftX = OVERLAY_MARGIN;
  const topY = OVERLAY_MARGIN + 48;
  const middleY = Math.round((sh - height) / 2);
  const bottomY = sh - height - OVERLAY_MARGIN;

  return {
    "right-top": { x: rightX, y: topY },
    "right-middle": { x: rightX, y: middleY },
    "right-bottom": { x: rightX, y: bottomY },
    "left-top": { x: leftX, y: topY },
    "left-middle": { x: leftX, y: middleY },
    "left-bottom": { x: leftX, y: bottomY },
    custom: { x: window.screenX, y: window.screenY },
  };
}

export function Overlay(): JSX.Element {
  const activeQuestsSortedByPriority = useQuestStore((s) => s.activeQuestsSortedByPriority);
  const overlayQuests = useQuestStore((s) => s.overlayQuests);
  const subtasksForQuest = useQuestStore((s) => s.subtasksForQuest);
  const toggleSubtask = useQuestStore((s) => s.toggleSubtask);
  const completeQuest = useQuestStore((s) => s.completeQuest);
  const lastXpEvents = useQuestStore((s) => s.lastXpEvents);
  const clearXpEvent = useQuestStore((s) => s.clearXpEvent);
  const maxVisibleQuests = useOverlayStore((s) => s.maxVisibleQuests);
  const dragEnabled = useOverlayStore((s) => s.dragEnabled);
  const setDragEnabled = useOverlayStore((s) => s.setDragEnabled);
  const collapsed = useOverlayStore((s) => s.collapsed);
  const setCollapsed = useOverlayStore((s) => s.setCollapsed);
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({});
  const [snapPreview, setSnapPreview] = useState<OverlayAnchor | null>(null);
  const [isInteractiveHover, setIsInteractiveHover] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    startMouseX: number;
    startMouseY: number;
    startWindowX: number;
    startWindowY: number;
    active: boolean;
  } | null>(null);

  const activeQuests = activeQuestsSortedByPriority();
  const quests = overlayQuests().slice(0, maxVisibleQuests);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    let lastHeight = 0;
    const reportHeight = () => {
      const height = Math.ceil(content.scrollHeight);
      if (Math.abs(height - lastHeight) < 2) return;
      lastHeight = height;
      window.questboard.window.setOverlayContentHeight(height).catch(console.error);
    };
    const observer = new ResizeObserver(reportHeight);
    observer.observe(content);
    reportHeight();
    return () => observer.disconnect();
  }, []);

  const setMousePassthrough = useCallback((enabled: boolean) => {
    window.questboard.window.setMousePassthrough(enabled).catch(console.error);
  }, []);

  useEffect(() => {
    // Default to click-through so transparent gaps do not block underlying apps.
    const dragging = Boolean(dragRef.current?.active);
    const shouldPassthrough = !(dragEnabled || isInteractiveHover || dragging);
    setMousePassthrough(shouldPassthrough);
    return () => setMousePassthrough(false);
  }, [setMousePassthrough, dragEnabled, isInteractiveHover]);

  useEffect(() => {
    if (!dragEnabled && dragRef.current?.active) {
      dragRef.current.active = false;
      setSnapPreview(null);
    }
  }, [dragEnabled]);

  const onInteractiveEnter = () => {
    setIsInteractiveHover(true);
    if (!dragEnabled) setMousePassthrough(false);
  };
  const onInteractiveLeave = () => {
    setIsInteractiveHover(false);
    if (!dragEnabled) setMousePassthrough(true);
  };
  const onClose = () => window.questboard.window.closeSelf().catch(console.error);
  const onToggleAlwaysOnTop = () =>
    updateSettings({ alwaysOnTop: !(settings?.alwaysOnTop ?? true) });
  const onNewQuest = () => window.questboard.window.focusMain().catch(console.error);
  const onToggleCardCollapsed = (questId: string) =>
    setCollapsedCards((prev) => ({ ...prev, [questId]: !prev[questId] }));

  const onDragStart = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!dragEnabled) return;
    if ((event.target as HTMLElement).closest("button, input, textarea, select, a")) return;
    dragRef.current = {
      startMouseX: event.screenX,
      startMouseY: event.screenY,
      startWindowX: window.screenX,
      startWindowY: window.screenY,
      active: true,
    };
    event.preventDefault();
    setSnapPreview(settings?.overlayAnchor ?? "right-top");
  };

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      if (!dragRef.current?.active) return;
      const deltaX = event.screenX - dragRef.current.startMouseX;
      const deltaY = event.screenY - dragRef.current.startMouseY;
      const x = Math.round(dragRef.current.startWindowX + deltaX);
      const y = Math.round(dragRef.current.startWindowY + deltaY);
      window.questboard.window.setOverlayPosition(x, y).catch(console.error);

      if (settings?.overlayAnchor === "custom") {
        setSnapPreview(null);
        return;
      }

      const points = getSnapPoints();
      let nearest: OverlayAnchor = "right-top";
      let nearestDist = Number.POSITIVE_INFINITY;
      for (const anchor of SNAP_ANCHORS) {
        const px = points[anchor].x;
        const py = points[anchor].y;
        const dist = Math.hypot(px - x, py - y);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = anchor;
        }
      }
      setSnapPreview(nearestDist <= SNAP_THRESHOLD ? nearest : null);
    };
    const onUp = () => {
      if (!dragRef.current?.active) return;
      dragRef.current.active = false;
      if (settings?.overlayAnchor === "custom") {
        updateSettings({
          overlayAnchor: "custom",
          overlayX: window.screenX,
          overlayY: window.screenY,
        });
        setSnapPreview(null);
        return;
      }
      const selected = snapPreview;
      if (selected) {
        const points = getSnapPoints();
        const target = points[selected];
        window.questboard.window.setOverlayPosition(target.x, target.y).catch(console.error);
        updateSettings({
          overlayAnchor: selected,
          overlayX: null,
          overlayY: null,
        });
      } else {
        updateSettings({
          overlayAnchor: "custom",
          overlayX: window.screenX,
          overlayY: window.screenY,
        });
      }
      setSnapPreview(null);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [updateSettings, snapPreview]);

  return (
    <div ref={contentRef} className="flex w-full flex-col items-end gap-3 overflow-hidden p-3">
      <motion.div
        onMouseEnter={onInteractiveEnter}
        onMouseLeave={onInteractiveLeave}
        onMouseDown={onDragStart}
        className={`no-drag flex w-full flex-col items-end gap-3 overflow-hidden ${
          dragEnabled
            ? "cursor-grab rounded-2xl border border-dashed border-white/25 bg-black/10 p-2 active:cursor-grabbing"
            : ""
        }`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <OverlayControls
          dragEnabled={dragEnabled}
          collapsed={collapsed}
          alwaysOnTop={settings?.alwaysOnTop ?? true}
          onToggleDrag={() => setDragEnabled(!dragEnabled)}
          onToggleCollapsed={() => setCollapsed(!collapsed)}
          onToggleAlwaysOnTop={onToggleAlwaysOnTop}
          onClose={onClose}
          onOpenMain={onNewQuest}
        />
        {!collapsed && <ComboBadge />}
        {!collapsed && (
          <div className="w-full overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              {quests.length === 0 && activeQuests.length === 0 ? (
                <motion.div
                  key="celebration"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <OverlayCelebration onNewQuest={onNewQuest} />
                </motion.div>
              ) : quests.length === 0 ? (
                <motion.div
                  key="overlay-empty-selection"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="rounded-hud border border-hud-border bg-hud-bg p-4 text-center text-xs text-white/70 backdrop-blur-hud"
                >
                  <p>Widget seçimi yok. Ana pencereden kartlarda ☑ Widgette Göster seç.</p>
                  <button
                    type="button"
                    onClick={onNewQuest}
                    className="mt-2 rounded-md bg-sky-400/85 px-3 py-1 text-xs font-semibold text-black hover:bg-sky-300"
                  >
                    Widget Görevlerini Seç
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="cards"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <AnimatePresence initial={false}>
                    {quests.map((quest) => (
                      <motion.div
                        key={quest.id}
                        layout
                        initial={{ opacity: 0, x: 18, scale: 0.96 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 18, scale: 0.96 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                        className="mb-3 w-full last:mb-0"
                      >
                        <QuestCard
                          quest={quest}
                          subtasks={subtasksForQuest(quest.id)}
                          onToggleSubtask={toggleSubtask}
                          onComplete={completeQuest}
                          collapsed={Boolean(collapsedCards[quest.id])}
                          onToggleCollapsed={onToggleCardCollapsed}
                          xpEvents={lastXpEvents}
                          onXpEventConsumed={clearXpEvent}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
}
