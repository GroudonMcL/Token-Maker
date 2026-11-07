// The Themes button: a painter's palette that opens a
// small menu of Token Maker's themes, each shown by its own colours. The
// choice applies to both apps at once. It replaced the separate light/dark switch.

import { useEffect, useRef, useState } from 'react';
import { Check, Palette } from 'lucide-react';
import { PALETTES, usePalette } from './palettes';
import './shell-ui.css';

export function PalettePicker({ className = 'icon-btn' }: { className?: string }) {
  const [palette, setPalette] = usePalette();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
    const onDown = (e: PointerEvent) => {
      if (!menu.current?.contains(e.target as Node) && !button.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const current = PALETTES.find((p) => p.id === palette)!;
  const close = () => {
    setOpen(false);
    button.current?.focus();
  };

  return (
    <div className="palette-picker">
      <button ref={button} type="button" className={className} aria-label="Themes" title={`Themes: ${current.name}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Palette size={18} />
      </button>
      {open && (
        <div
          ref={menu}
          className="palette-menu"
          role="menu"
          aria-label="Themes"
          onKeyDown={(e) => {
            const items = [...(menu.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? [])];
            const i = items.indexOf(document.activeElement as HTMLElement);
            if (e.key === 'Escape') close();
            else if (e.key === 'ArrowDown') items[(i + 1) % items.length]?.focus();
            else if (e.key === 'ArrowUp') items[(i - 1 + items.length) % items.length]?.focus();
            else if (e.key === 'Home') items[0]?.focus();
            else if (e.key === 'End') items.at(-1)?.focus();
            else if (e.key === 'Tab') setOpen(false);
            else return;
            if (e.key !== 'Tab') e.preventDefault();
          }}
        >
          <p className="palette-menu__title">Themes</p>
          {PALETTES.map((p) => (
            <button
              key={p.id}
              type="button"
              role="menuitemradio"
              aria-checked={palette === p.id}
              tabIndex={-1}
              className="palette-menu__item"
              onClick={() => setPalette(p.id)}
            >
              <span className="palette-preview" data-palette={p.id} aria-hidden="true">
                <span style={{ background: 'var(--bg-gradient)' }} />
                <span style={{ background: 'var(--surface)' }} />
                <span style={{ background: 'var(--border-strong)' }} />
                <span style={{ background: 'var(--focus)' }} />
                <span style={{ background: 'var(--accent)' }} />
              </span>
              <span className="palette-menu__text">
                <strong>{p.name}</strong>
                <small>{p.note}</small>
              </span>
              {palette === p.id && <Check size={16} aria-hidden="true" className="palette-menu__check" />}
            </button>
          ))}
          <p className="palette-menu__note">Applies to both apps.</p>
        </div>
      )}
    </div>
  );
}
