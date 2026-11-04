// Advanced mode only: the project as JSON, for people who like to see or edit
// the data. Nothing here is ever run as code: an edit is read by the same
// checker as an opened file, and a bad one is refused with the reason.

import { useState } from 'react';
import { parseProject, serializeProject } from '../project/migrate';
import { findLayer } from '../project/tree';
import { history, select, ui, useProject } from '../state/projectStore';
import { Fold } from './controls';

export function DataView() {
  const project = useProject();
  const [draft, setDraft] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const text = draft ?? serializeProject(project);

  const apply = () => {
    if (draft === null) return;
    const result = parseProject(draft);
    if (!result.ok) {
      setMessage({ text: result.error, error: true });
      return;
    }
    history.getState().set(result.project);
    if (!findLayer(result.project.layers, ui.getState().selectedId)) select(result.project.layers.at(-1)?.id ?? null);
    setDraft(null);
    setMessage({ text: result.warnings.length ? `Applied, with changes: ${result.warnings.join(' ')}` : 'Applied. Undo takes it back.', error: false });
  };

  return (
    <Fold title="Advanced: project data">
      <p className="note">The whole design as data. You can edit it and press Apply; you never need to.</p>
      <textarea className="data" aria-label="Project data" spellCheck={false} value={text} onChange={(e) => setDraft(e.target.value)} rows={14} />
      <div className="row">
        <button type="button" className="btn small primary" disabled={draft === null} onClick={apply}>
          Apply
        </button>
        <button type="button" className="btn small" disabled={draft === null} onClick={() => (setDraft(null), setMessage(null))}>
          Discard edits
        </button>
      </div>
      {message && (
        <p className={message.error ? 'note warning' : 'note'} role="status">
          {message.text}
        </p>
      )}
    </Fold>
  );
}
