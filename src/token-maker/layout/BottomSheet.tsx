import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { toolStore } from '../editor/tools';
import { usePanelNav } from './panelNav';
import { PANEL_TABS } from './sections';
import { TabSections } from './TabSections';
import { ExportButton } from './BottomBar';
import { TokenSummary } from './TokenSummary';

export type SheetSnap = 'peek' | 'half' | 'full';
const ORDER: SheetSnap[] = ['peek', 'half', 'full'];
import { PEEK_HEIGHT, useSheetCover } from './sheetCover';

export { PEEK_HEIGHT };

function snapHeight(snap: SheetSnap, container: number) {
  if (snap === 'peek') return PEEK_HEIGHT;
  if (snap === 'half') return Math.max(PEEK_HEIGHT, Math.round(container * 0.5));
  return Math.max(PEEK_HEIGHT, Math.round(container * 0.88));
}

/**
 * Phone bottom sheet (DESIGN.md §8): drag the handle up/down (or tap it, or
 * use arrow keys) to resize; icon tabs switch between sections.
 */
export function BottomSheet() {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [container, setContainer] = useState(800);
  const [snap, setSnap] = useState<SheetSnap>('peek');
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  // A section asked to be shown: open the sheet so it can be seen.
  const nav = usePanelNav(() => setSnap((s) => (s === 'peek' ? 'half' : s)));
  const tab = nav.tab.id;
  const drag = useRef<{ startY: number; startH: number; moved: boolean } | null>(null);
  const panelId = useId();

  // Track the editor height so snap points stay proportional.
  useLayoutEffect(() => {
    const parent = sheetRef.current?.parentElement;
    if (!parent) return;
    const update = () => setContainer(parent.clientHeight || window.innerHeight);
    update();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    ro?.observe(parent);
    return () => ro?.disconnect();
  }, []);

  const height = dragHeight ?? snapHeight(snap, container);
  // A full-height sheet covers the canvas anyway: keep the token where a half sheet leaves it.
  useEffect(() => useSheetCover.setState(snapHeight(snap === 'full' ? 'half' : snap, container), true), [snap, container]);
  useEffect(() => () => useSheetCover.setState(PEEK_HEIGHT, true), []);

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { startY: e.clientY, startH: height, moved: false };
  };
  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d) return;
    const dy = e.clientY - d.startY;
    if (Math.abs(dy) > 4) d.moved = true;
    if (!d.moved) return;
    const max = snapHeight('full', container);
    setDragHeight(Math.min(max, Math.max(PEEK_HEIGHT - 40, d.startH - dy)));
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (!d.moved) {
      setSnap(snap === 'peek' ? 'half' : 'peek'); // a tap toggles open/closed
      return;
    }
    const h = dragHeight ?? height;
    const nearest = ORDER.reduce((best, s) =>
      Math.abs(snapHeight(s, container) - h) < Math.abs(snapHeight(best, container) - h) ? s : best,
    );
    setSnap(nearest);
    setDragHeight(null);
  };
  const onHandleKey = (e: KeyboardEvent) => {
    const i = ORDER.indexOf(snap);
    if (e.key === 'ArrowUp') setSnap(ORDER[Math.min(2, i + 1)]!);
    else if (e.key === 'ArrowDown') setSnap(ORDER[Math.max(0, i - 1)]!);
    else return;
    e.preventDefault();
  };

  const chooseTab = (id: string) => {
    nav.setTab(id);
    if (snap === 'peek') setSnap('half');
  };

  // The brush and eyedropper need the picture: lower the sheet while they're on, then put it back.
  const snapRef = useRef(snap);
  useEffect(() => {
    snapRef.current = snap;
  }, [snap]);
  useEffect(() => {
    let before: SheetSnap | null = null;
    return toolStore.subscribe((state, prev) => {
      if (state.tool === prev.tool) return;
      // A tool the tab turned on by itself (Background, Pop-out) leaves the sheet where it is.
      if (state.autoTool || prev.autoTool) {
        before = null;
        return;
      }
      if (prev.tool === 'move') {
        before = snapRef.current;
        setSnap('peek');
      } else if (state.tool === 'move' && before) {
        setSnap(before);
        before = null;
      }
    });
  }, []);

  // Keep the active tab button visible in the scrolling tab row, and start a new tab at its top.
  useEffect(() => {
    sheetRef.current?.querySelector(`[data-tab="${tab}"]`)?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    const content = sheetRef.current?.querySelector('.bottom-sheet__content');
    if (content) content.scrollTop = 0;
  }, [tab]);

  const active = nav.tab;

  return (
    <div
      ref={sheetRef}
      className="bottom-sheet"
      data-snap={snap}
      data-dragging={dragHeight !== null || undefined}
      style={{ height }}
    >
      <div className="bottom-sheet__grab" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
        <button
          type="button"
          className="bottom-sheet__handle"
          aria-label={snap === 'peek' ? 'Open settings panel' : 'Resize settings panel'}
          aria-expanded={snap !== 'peek'}
          aria-controls={panelId}
          onKeyDown={onHandleKey}
          onClick={(e) => {
            // Pointer taps are handled in onPointerUp; this handles Enter/Space.
            if (e.detail === 0) setSnap(snap === 'peek' ? 'half' : 'peek');
          }}
        >
          <span className="bottom-sheet__bar" />
        </button>
        <div className="bottom-sheet__summary">
          <TokenSummary />
          <ExportButton short />
        </div>
      </div>
      <div className="bottom-sheet__tabs" role="tablist" aria-label="Settings">
        {PANEL_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            data-tab={t.id}
            className="bottom-sheet__tab"
            aria-selected={t.id === tab}
            aria-controls={panelId}
            onClick={() => chooseTab(t.id)}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>
      <div className="bottom-sheet__content" id={panelId} role="tabpanel" aria-label={active.label} hidden={snap === 'peek' && dragHeight === null}>
        <TabSections tab={active} openSection={nav.openSection} setOpenSection={nav.setOpenSection} onNext={chooseTab} />
      </div>
    </div>
  );
}
