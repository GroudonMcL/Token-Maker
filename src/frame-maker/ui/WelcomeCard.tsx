// The welcome card: shown on the first visit (and again from Help in the top
// bar), with the few things worth knowing before starting. It doesn't block
// the editor; closing it is remembered in this browser.

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Credits } from './Credits';
import { rememberWelcomed } from './welcome';

export function WelcomeCard({ onClose, onTemplates }: { onClose: () => void; onTemplates: () => void }) {
  const start = useRef<HTMLButtonElement>(null);
  useEffect(() => start.current?.focus(), []);
  const close = () => {
    rememberWelcomed();
    onClose();
  };
  return (
    <section
      className="welcome"
      role="dialog"
      aria-modal="false"
      aria-labelledby="welcome-title"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          close();
        }
      }}
    >
      <div className="welcome-head">
        <h2 id="welcome-title">Welcome to Frame Maker</h2>
        <button type="button" className="icon-btn" aria-label="Close the welcome card" onClick={close}>
          <X size={18} />
        </button>
      </div>
      <ul>
        <li>
          <strong>Start from a template</strong> with <em>New</em>: any of Token Maker’s frames, ones you can change part by part, or a blank page.
        </li>
        <li>
          <strong>Layers</strong> (on the left) stack up to make the frame; pick one to change it in <strong>Properties</strong> (on the right), or on the canvas.
        </li>
        <li>
          Everything follows the band, so a design fits <strong>every token shape</strong>. Try the shapes and the light dial under the canvas.
        </li>
        <li>
          Point at (or tap) a <span className="help-tip demo" aria-hidden="true">?</span> for a tip about a setting. <strong>Advanced</strong> in the top bar shows every setting.
        </li>
        <li>
          Your work is <strong>saved in this browser</strong> as you go. <em>Save</em> downloads a project file; <em>Export</em> makes pictures; Token Maker can open the project file
          as a frame.
        </li>
      </ul>
      <Credits />
      <div className="row">
        <button
          type="button"
          className="btn"
          onClick={() => {
            close();
            onTemplates();
          }}
        >
          Show me the templates
        </button>
        <button ref={start} type="button" className="btn primary" onClick={close}>
          Start
        </button>
      </div>
    </section>
  );
}
