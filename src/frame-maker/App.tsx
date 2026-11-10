import { useEffect, useRef, useState, useSyncExternalStore, type ComponentType, type CSSProperties } from 'react';
import { loadAutosave, startAutosave } from './state/autosave';
import { findLayer, isLocked } from './project/tree';
import { deleteLayer, duplicateLayer, groupSelected, loadProject, redo, ui, undo, ungroup, history } from './state/projectStore';
import { copyPicked, cutPicked, pasteLayers } from './state/clipboard';
import { clearMessage, showMessage, useMessage } from './state/messages';
import { useProjectPart } from './state/projectStore';
import { projectFromFrame } from './project/defaults';
import { LayersPanel } from './ui/LayersPanel';
import { LightingPanel } from './ui/LightingPanel';
import { PanelResizer } from './ui/PanelResizer';
import { readPanelWidth } from './ui/panelWidth';
import { LibraryDialog } from './ui/LibraryDialog';
import { PropertiesPanel } from './ui/PropertiesPanel';
import { pathEditKey } from './ui/pathKeys';
import { Stage } from './ui/Stage';
import { TextureDialog } from './ui/TextureDialog';
import { TopBar } from './ui/TopBar';
import { WelcomeCard } from './ui/WelcomeCard';
import { RandomiseDialog, ThemeDialog } from './ui/WorkflowDialogs';
import { hasBeenWelcomed } from './ui/welcome';

const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

/** Below this width the panels move into a sheet under the canvas (phones and small tablets). */
export const NARROW_QUERY = '(max-width: 959px)';

function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const m = window.matchMedia(query);
      m.addEventListener('change', onChange);
      return () => m.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
  );
}

type TemplateDialogProps = { mode: 'new' | 'addFrame'; onClose: () => void };

/**
 * The New / Add frame gallery. It lists every Token Maker frame, several
 * hundred kB of designs, so its code is fetched when it is first opened
 * rather than with the editor.
 */
function TemplateDialog({ mode, onClose }: TemplateDialogProps) {
  const [Dialog, setDialog] = useState<ComponentType<TemplateDialogProps> | null>(null);
  useEffect(() => {
    let live = true;
    import('./ui/TemplateDialog').then(
      (m) => live && setDialog(() => m.TemplateDialog),
      () => {
        if (!live) return;
        showMessage("The frames couldn't be loaded. Check your connection and try again.", true);
        onClose();
      },
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return Dialog ? <Dialog mode={mode} onClose={onClose} /> : <div className="toast" role="status">Loading frames…</div>;
}

export function App() {
  const [ready, setReady] = useState(false);
  const [dialog, setDialog] = useState<'new' | 'addFrame' | 'texture' | 'library' | 'vary' | 'theme' | null>(null);
  const [welcome, setWelcome] = useState(() => !hasBeenWelcomed());
  const [sheet, setSheet] = useState<'layers' | 'properties'>('layers');
  const narrow = useMediaQuery(NARROW_QUERY);
  const message = useMessage();
  // Only the stage: the whole editor would otherwise be drawn again on every step of every slider.
  const stage = useProjectPart((p) => p.stage);
  // The side panels' widths, dragged with the handles on their inner edges (null: the layout's own).
  const [layersWidth, setLayersWidth] = useState<number | null>(() => readPanelWidth('layers'));
  const [propertiesWidth, setPropertiesWidth] = useState<number | null>(() => readPanelWidth('properties'));
  const workspace = useRef<HTMLElement>(null);

  // Pick up where the last visit left off; a first visit starts with Stamped.
  useEffect(() => {
    let stop = () => {};
    void loadAutosave().then((saved) => {
      loadProject(saved.project ?? projectFromFrame('stamped'));
      if (saved.unreadable) showMessage("The design from your last visit couldn't be opened, so this is a new one. The old one is still kept in this browser.", true);
      stop = startAutosave();
      setReady(true);
    });
    return () => stop();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z' && !isTyping(e.target)) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === 'y' && !isTyping(e.target)) {
        e.preventDefault();
        redo();
      } else if (!isTyping(e.target) && pathEditKey(e)) {
        e.preventDefault();
      } else if (!isTyping(e.target) && ui.getState().selectedId) {
        const id = ui.getState().selectedId!;
        const layers = history.getState().present.layers;
        const layer = findLayer(layers, id);
        if (mod && e.key.toLowerCase() === 'g') {
          e.preventDefault();
          if (e.shiftKey) ungroup(id);
          else groupSelected();
        } else if ((e.key === 'Delete' || e.key === 'Backspace') && layer && !isLocked(layers, id)) {
          e.preventDefault();
          deleteLayer(id);
        } else if (mod && e.key.toLowerCase() === 'd') {
          e.preventDefault();
          duplicateLayer(id);
        }
      }
    };
    // Copy, cut and paste layers through the system clipboard, so they reach other tabs (and other browsers).
    const onCopy = (e: ClipboardEvent, cut = false) => {
      if (isTyping(e.target) || window.getSelection()?.toString()) return;
      const text = cut ? cutPicked() : copyPicked();
      if (text === null) return;
      e.preventDefault();
      e.clipboardData?.setData('text/plain', text);
    };
    const onCut = (e: ClipboardEvent) => onCopy(e, true);
    const onPaste = (e: ClipboardEvent) => {
      if (isTyping(e.target)) return;
      if (pasteLayers(e.clipboardData?.getData('text/plain') ?? null)) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('copy', onCopy);
    document.addEventListener('cut', onCut);
    document.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('cut', onCut);
      document.removeEventListener('paste', onPaste);
    };
  }, []);

  useEffect(() => {
    if (!message) return;
    const id = setTimeout(clearMessage, message.error ? 9000 : 5000);
    return () => clearTimeout(id);
  }, [message]);

  if (!ready) return <div className="loading">Loading Frame Maker…</div>;

  // The lighting card sits above the layers.
  const layers = (
    <div className="side-column">
      <LightingPanel stage={stage} />
      <LayersPanel onAddFrame={() => setDialog('addFrame')} onAddTexture={() => setDialog('texture')} onOpenLibrary={() => setDialog('library')} />
    </div>
  );
  const widths = {
    ...(layersWidth !== null && { '--layers-w': `${layersWidth}px` }),
    ...(propertiesWidth !== null && { '--props-w': `${propertiesWidth}px` }),
  } as CSSProperties;

  return (
    <div className={`app${narrow ? ' narrow' : ''}`}>
      <TopBar narrow={narrow} onNew={() => setDialog('new')} onHelp={() => setWelcome(true)} onMessage={showMessage} onVary={() => setDialog('vary')} onTheme={() => setDialog('theme')} />
      {narrow ? (
        <main className="workspace narrow">
          <Stage />
          <div className="sheet">
            <div className="sheet-tabs" role="tablist" aria-label="Panels">
              {(['layers', 'properties'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  id={`tab-${t}`}
                  aria-selected={sheet === t}
                  aria-controls={`sheet-${t}`}
                  tabIndex={sheet === t ? 0 : -1}
                  className={sheet === t ? 'on' : ''}
                  onClick={() => setSheet(t)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                      const next = t === 'layers' ? 'properties' : 'layers';
                      setSheet(next);
                      document.getElementById(`tab-${next}`)?.focus();
                    }
                  }}
                >
                  {t === 'layers' ? 'Layers' : 'Properties'}
                </button>
              ))}
            </div>
            <div className="sheet-body" role="tabpanel" id={`sheet-${sheet}`} aria-labelledby={`tab-${sheet}`}>
              {sheet === 'layers' ? layers : <PropertiesPanel />}
            </div>
          </div>
        </main>
      ) : (
        <main className="workspace" ref={workspace} style={widths}>
          {layers}
          <Stage />
          <PropertiesPanel />
          <PanelResizer side="layers" width={layersWidth} onChange={setLayersWidth} panel={() => workspace.current?.querySelector('.side-column') ?? null} />
          <PanelResizer side="properties" width={propertiesWidth} onChange={setPropertiesWidth} panel={() => workspace.current?.querySelector('.panel.properties') ?? null} />
        </main>
      )}
      {message && (
        <div className={`toast${message.error ? ' error' : ''}`} role={message.error ? 'alert' : 'status'}>
          {message.text}
        </div>
      )}
      {welcome && <WelcomeCard onClose={() => setWelcome(false)} onTemplates={() => setDialog('new')} />}
      {dialog === 'texture' && <TextureDialog onClose={() => setDialog(null)} />}
      {dialog === 'library' && <LibraryDialog onClose={() => setDialog(null)} />}
      {dialog === 'vary' && <RandomiseDialog onClose={() => setDialog(null)} />}
      {dialog === 'theme' && <ThemeDialog onClose={() => setDialog(null)} />}
      {(dialog === 'new' || dialog === 'addFrame') && <TemplateDialog mode={dialog} onClose={() => setDialog(null)} />}
    </div>
  );
}
