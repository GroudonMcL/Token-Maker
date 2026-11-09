import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { useBatch } from '../batch/batch';
import { listenForSentFrames } from '../editor/shellBridge';
import { useGlobalImport } from '../editor/useGlobalImport';
import { useShortcuts } from '../editor/useShortcuts';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { holdImportsUntil } from '../import/importImage';
import { restore, startAutosave, type RestoreResult } from '../state/autosave';
import { watchFrameImages } from '../state/frameLibrary';
import { watchLabelFonts } from '../fonts/fontLoader';
import { watchLibraryImages } from '../state/libraryAssets';
import { watchPictures } from '../state/pictureLibrary';
import { watchAiRemoval } from '../image/aiRemoval';
import { preloadSections } from '../sections';
import { toast } from '../ui/toast';
import { Toasts } from '../ui/Toasts';
import { AdSlot } from './AdSlot';
import { BottomBar } from './BottomBar';
import { BottomSheet } from './BottomSheet';
import { CanvasArea } from './CanvasArea';
import { ExportProgress } from './ExportProgress';
import { PanelResizer } from './PanelResizer';
import { readPanelWidth } from './panelWidth';
import { SidePanel } from './SidePanel';
import { TopBar } from './TopBar';
import { usePanelNav } from './panelNav';
import { ToolRail } from './ToolRail';

let booted = false;
/** Restores the autosaved token once, then keeps saving. */
function boot() {
  if (booted) return;
  booted = true;
  // restore() never throws: a token it can't reopen is kept, not overwritten.
  const restoring = restore();
  // A picture dropped or pasted meanwhile goes in once the token is back, not under it.
  holdImportsUntil(restoring);
  void restoring.then((result) => {
    reportRestore(result);
    startAutosave();
    watchLibraryImages();
    watchFrameImages();
    watchPictures();
    watchAiRemoval();
    watchLabelFonts();
    preloadSections();
    listenForSentFrames();
  });
}

/** Tells the user when the last token didn't come back as it was. */
function reportRestore(result: RestoreResult) {
  if (result.status === 'restored' && result.missingPictures) {
    const n = result.missingPictures;
    toast(`${n === 1 ? 'A picture' : `${n} pictures`} from your last token couldn't be reopened, so ${n === 1 ? 'it was' : 'they were'} left out.`, 'error', 10_000);
  } else if (result.status === 'unreadable') {
    toast(
      result.kept
        ? "Your last token couldn't be reopened, so this is a new one. The old one is still kept in this browser."
        : "Your last token couldn't be reopened. Autosave is off until you click New, so it isn't overwritten.",
      'error',
      12_000,
    );
  }
}

/**
 * The editor layout (DESIGN.md §8).
 * - Desktop (≥ 1024px) and tablet (768–1023px, narrower panel): tool rail + canvas + right panel
 *   showing the chosen tab + bottom bar (layout A, the owner's choice).
 * - Phone (< 768px): canvas on top, draggable bottom sheet with the same tabs.
 * The editor fills the screen; the About/Privacy links sit in the bottom bar (or sheet).
 */
export function AppShell() {
  const wide = useMediaQuery('(min-width: 768px)');
  const dropping = useGlobalImport();
  const batch = useBatch((b) => b.on);
  useShortcuts();
  useEffect(boot, []);
  return (
    <>
      <div className={`editor ${wide ? 'editor--wide' : 'editor--phone'}`}>
        <TopBar compact={!wide} />
        {wide ? <WideBody /> : (
          <div className="editor__body">
            <CanvasArea phone />
            <BottomSheet />
          </div>
        )}
        {wide && <BottomBar />}
        {dropping && (
          <div className="drop-overlay" aria-hidden="true">
            <p>{batch ? 'Drop the pictures to add them to the batch' : 'Drop the image to use it'}</p>
          </div>
        )}
      </div>
      <ExportProgress />
      <Toasts />
      <AdSlot />
    </>
  );
}

/** Desktop and tablet: tool rail, canvas, resizable panel. */
function WideBody() {
  const nav = usePanelNav();
  const panelId = useId();
  const [panelWidth, setPanelWidth] = useState<number | null>(readPanelWidth);
  const bodyRef = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={bodyRef}
      className="editor__body"
      style={panelWidth !== null ? ({ '--panel-w': `min(${panelWidth}px, 60vw)`, '--panel-w-narrow': `min(${panelWidth}px, 60vw)` } as CSSProperties) : undefined}
    >
      <ToolRail active={nav.tab} panelId={panelId} onChoose={nav.setTab} />
      <CanvasArea phone={false} />
      <PanelResizer width={panelWidth} onChange={setPanelWidth} panel={() => bodyRef.current?.querySelector('.side-panel') ?? null} />
      <SidePanel tab={nav.tab} panelId={panelId} openSection={nav.openSection} setOpenSection={nav.setOpenSection} setTab={nav.setTab} />
    </div>
  );
}
