import { FilePlus2, Redo2, Undo2 } from 'lucide-react';
import { droppedByTurningOff, setBatchMode, useBatch } from '../batch/batch';
import { startNewToken } from '../editor/newToken';
import { redo, undo, useCanRedo, useCanUndo } from '../state/tokenStore';
import { Toggle } from '../components';
import { Link } from '../components/Link';
import { AppSwitch } from '../../shell/AppSwitch';
import { inSite } from '../../shell/apps';
import { PalettePicker } from '../../shell/PalettePicker';
import { BrandMark } from './BrandMark';
import { PanelSettings } from './PanelSettings';

/** Logo, Batch toggle, Undo/Redo, New (DESIGN.md §8). Inside Token Maker the title is the switch between the apps. */
export function TopBar({ compact }: { compact: boolean }) {
  const batch = useBatch((b) => b.on);
  const setBatch = (on: boolean) => {
    const dropped = droppedByTurningOff();
    if (!on && dropped && !window.confirm(`Leave batch mode? Only the token on screen is kept; the other ${dropped} picture${dropped === 1 ? '' : 's'} will be removed.`)) return;
    setBatchMode(on);
  };
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  return (
    <header className={`topbar${inSite() ? ' topbar--site' : ''}`}>
      <AppSwitch
        current="token-maker"
        compact={compact}
        logo={!compact && <BrandMark />}
        standalone={
          <Link href="/" className="topbar__brand" aria-label="Token Maker home">
            <BrandMark />
            {!compact && <span className="topbar__name">Token Maker</span>}
          </Link>
        }
      />
      <div className="topbar__spacer" />
      <Toggle label="Batch" checked={batch} onChange={setBatch} />
      <div className="topbar__group" role="group" aria-label="History">
        <button type="button" className="icon-btn" aria-label="Undo" title="Undo (Ctrl+Z)" disabled={!canUndo} onClick={undo}>
          <Undo2 size={18} />
        </button>
        <button type="button" className="icon-btn" aria-label="Redo" title="Redo (Ctrl+Y)" disabled={!canRedo} onClick={redo}>
          <Redo2 size={18} />
        </button>
      </div>
      <button type="button" className="btn btn--ghost" title="Start a new token" onClick={startNewToken}>
        <FilePlus2 size={18} aria-hidden="true" />
        {!compact && <span>New</span>}
        {compact && <span className="visually-hidden">New</span>}
      </button>
      <div className="topbar__group" data-control="theme">
        <PanelSettings />
        <PalettePicker />
      </div>
    </header>
  );
}
