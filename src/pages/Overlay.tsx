import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { useQuestStore } from "../store/questStore";
import { useOverlayStore } from "../store/overlayStore";
import { useSettingsStore } from "../store/settingsStore";
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
export function Overlay(): JSX.Element {
  const activeQuestsSortedByPriority = useQuestStore((s) => s.activeQuestsSortedByPriority);
  const overlayQuests = useQuestStore((s) => s.overlayQuests);
  const subtasksForQuest = useQuestStore((s) => s.subtasksForQuest);
  const toggleSubtask = useQuestStore((s) => s.toggleSubtask);
  const completeQuest = useQuestStore((s) => s.completeQuest);
  const toggleOverlayPinned = useQuestStore((s) => s.toggleOverlayPinned);
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
  const [isInteractiveHover, setIsInteractiveHover] = useState(false);
  const [clickThroughEnabled, setClickThroughEnabled] = useState(false);
  const [clickThroughControlHovered, setClickThroughControlHovered] = useState(false);
  const [idleDimmed, setIdleDimmed] = useState(false);
  const clickThroughControlRef = useRef<HTMLButtonElement>(null);
  const interactiveAreaRef = useRef<HTMLDivElement>(null);
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
    let receivedChange = false;
    const setClickThrough = (enabled: boolean) => {
      receivedChange = true;
      setClickThroughEnabled(enabled);
      if (!enabled) setClickThroughControlHovered(false);
    };
    const unsubscribe = window.questboard.window.onOverlayClickThroughChanged(setClickThrough);
    window.questboard.window
      .getOverlayClickThrough()
      .then((enabled) => {
        if (!receivedChange) setClickThrough(enabled);
      })
      .catch(console.error);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    let lastHeight = 0;
    const reportHeight = () => {
      const height = Math.ceil(content.scrollHeight);
      const contentDoesNotFit = height > window.innerHeight + 2;
      if (Math.abs(height - lastHeight) < 2 && !contentDoesNotFit) return;
      lastHeight = height;
      window.questboard.window.setOverlayContentHeight(height).catch(console.error);
    };
    const observer = new ResizeObserver(reportHeight);
    observer.observe(content);
    if (content.firstElementChild instanceof HTMLElement) {
      observer.observe(content.firstElementChild);
    }
    reportHeight();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const idleDimMinutes = settings?.overlayIdleDimMinutes ?? 5;
    if (idleDimMinutes === 0 || isInteractiveHover) {
      setIdleDimmed(false);
      return;
    }
    const timeout = window.setTimeout(
      () => setIdleDimmed(true),
      idleDimMinutes * 60 * 1000
    );
    return () => window.clearTimeout(timeout);
  }, [settings?.overlayIdleDimMinutes, isInteractiveHover]);

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      const areaBounds = interactiveAreaRef.current?.getBoundingClientRect();
      const isInteractiveHover = Boolean(
        areaBounds &&
          event.clientX >= areaBounds.left &&
          event.clientX <= areaBounds.right &&
          event.clientY >= areaBounds.top &&
          event.clientY <= areaBounds.bottom
      );
      setIsInteractiveHover((current) =>
        current === isInteractiveHover ? current : isInteractiveHover
      );

      if (!clickThroughEnabled) {
        setClickThroughControlHovered(false);
        return;
      }
      const controlBounds = clickThroughControlRef.current?.getBoundingClientRect();
      const isOverClickThroughControl = Boolean(
        controlBounds &&
          event.clientX >= controlBounds.left &&
          event.clientX <= controlBounds.right &&
          event.clientY >= controlBounds.top &&
          event.clientY <= controlBounds.bottom
      );
      setClickThroughControlHovered((current) =>
        current === isOverClickThroughControl ? current : isOverClickThroughControl
      );
    };
    const clearHover = () => {
      setIsInteractiveHover(false);
      setClickThroughControlHovered(false);
    };
    const onMouseOut = (event: MouseEvent) => {
      if (event.relatedTarget === null) clearHover();
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseout", onMouseOut);
    window.addEventListener("blur", clearHover);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseout", onMouseOut);
      window.removeEventListener("blur", clearHover);
    };
  }, [clickThroughEnabled]);

  const setMousePassthrough = useCallback((enabled: boolean) => {
    window.questboard.window.setMousePassthrough(enabled).catch(console.error);
  }, []);

  useEffect(() => {
    // Default to click-through so transparent gaps do not block underlying apps.
    const dragging = Boolean(dragRef.current?.active);
    const shouldPassthrough =
      clickThroughEnabled
        ? !clickThroughControlHovered
        : !(dragEnabled || isInteractiveHover || dragging);
    setMousePassthrough(shouldPassthrough);
    return () => setMousePassthrough(false);
  }, [
    setMousePassthrough,
    dragEnabled,
    isInteractiveHover,
    clickThroughEnabled,
    clickThroughControlHovered,
  ]);

  useEffect(() => {
    if (!dragEnabled && dragRef.current?.active) {
      dragRef.current.active = false;
    }
  }, [dragEnabled]);

  const onInteractiveEnter = () => {
    setIsInteractiveHover(true);
  };
  const onInteractiveLeave = () => {
    setIsInteractiveHover(false);
  };
  const onToggleClickThrough = () =>
    window.questboard.window
      .setOverlayClickThrough(!clickThroughEnabled)
      .catch(console.error);
  const onClose = () => window.questboard.window.closeSelf().catch(console.error);
  const onToggleAlwaysOnTop = () =>
    updateSettings({ alwaysOnTop: !(settings?.alwaysOnTop ?? true) });
  const onNewQuest = () => window.questboard.window.focusMain().catch(console.error);
  const onToggleCardCollapsed = (questId: string) =>
    setCollapsedCards((prev) => ({ ...prev, [questId]: !prev[questId] }));

  const onDragStart = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!dragEnabled) return;
    const resizeEdge = 12;
    if (
      event.clientX <= resizeEdge ||
      event.clientY <= resizeEdge ||
      event.clientX >= window.innerWidth - resizeEdge ||
      event.clientY >= window.innerHeight - resizeEdge
    ) {
      return;
    }
    if ((event.target as HTMLElement).closest("button, input, textarea, select, a")) return;
    dragRef.current = {
      startMouseX: event.screenX,
      startMouseY: event.screenY,
      startWindowX: window.screenX,
      startWindowY: window.screenY,
      active: true,
    };
    event.preventDefault();
  };

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      if (!dragRef.current?.active) return;
      const deltaX = event.screenX - dragRef.current.startMouseX;
      const deltaY = event.screenY - dragRef.current.startMouseY;
      const x = Math.round(dragRef.current.startWindowX + deltaX);
      const y = Math.round(dragRef.current.startWindowY + deltaY);
      window.questboard.window.setOverlayPosition(x, y).catch(console.error);
    };
    const onUp = () => {
      if (!dragRef.current?.active) return;
      dragRef.current.active = false;
      updateSettings({
        overlayAnchor: "custom",
        overlayX: window.screenX,
        overlayY: window.screenY,
      });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [updateSettings]);

  return (
    <div
      ref={contentRef}
      className="overlay-scrollbar-hidden flex max-h-screen w-full flex-col items-end gap-3 overflow-x-hidden overflow-y-auto p-3"
      style={{
        height: "max-content",
        opacity: idleDimmed ? 0.22 : 1,
        transition: "opacity 350ms ease",
      }}
    >
      <motion.div
        ref={interactiveAreaRef}
        onMouseEnter={onInteractiveEnter}
        onMouseLeave={onInteractiveLeave}
        onMouseDown={onDragStart}
        className={`group no-drag flex w-full shrink-0 flex-col items-end gap-3 overflow-hidden ${
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
          showIconsOnHover={settings?.showIconsOnHover ?? true}
          controlsVisible={isInteractiveHover}
          clickThroughEnabled={clickThroughEnabled}
          clickThroughControlRef={clickThroughControlRef}
          onToggleClickThrough={onToggleClickThrough}
          onClickThroughControlEnter={() => setClickThroughControlHovered(true)}
          onClickThroughControlLeave={() => setClickThroughControlHovered(false)}
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
                          onRemoveFromOverlay={() => toggleOverlayPinned(quest.id, false)}
                          collapsed={Boolean(collapsedCards[quest.id])}
                          onToggleCollapsed={onToggleCardCollapsed}
                          xpEvents={lastXpEvents}
                          onXpEventConsumed={clearXpEvent}
                          fontSize={settings?.fontSize ?? 14}
                          showIconsOnHover={settings?.showIconsOnHover ?? true}
                          clickThroughEnabled={clickThroughEnabled}
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
