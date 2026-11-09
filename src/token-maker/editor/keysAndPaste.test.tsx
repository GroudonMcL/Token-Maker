import { renderHook } from '@testing-library/react';
import { getDoc, resetDoc, updateDoc } from '../state/tokenStore';
import { useGlobalImport } from './useGlobalImport';
import { useShortcuts } from './useShortcuts';

const imported = vi.hoisted(() => [] as File[]);
vi.mock('./importWithMessage', () => ({
  importWithMessage: async (file: File) => void imported.push(file),
  importFiles: async () => {},
}));

/** A field on the page, focused, that events start from. */
function field(html: string): HTMLElement {
  document.body.innerHTML = html;
  const el = document.body.firstElementChild as HTMLElement;
  el.focus();
  return el;
}

const ctrlZ = (target: EventTarget) => target.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));

/** A paste with what a clipboard holds: some text, an image, or both. */
function paste(target: EventTarget, { text = '', image = false }: { text?: string; image?: boolean }) {
  const file = new File(['png'], 'image.png', { type: 'image/png' });
  const e = new Event('paste', { bubbles: true, cancelable: true });
  Object.defineProperty(e, 'clipboardData', {
    value: {
      items: image ? [{ kind: 'file', type: 'image/png', getAsFile: () => file }] : [],
      getData: (type: string) => (type === 'text/plain' ? text : ''),
    },
  });
  target.dispatchEvent(e);
  return e;
}

beforeEach(() => {
  resetDoc();
  imported.length = 0;
  document.body.innerHTML = '';
});

describe('Ctrl+Z', () => {
  beforeEach(() => updateDoc((d) => ({ ...d, name: 'Changed' })));

  it('undoes the token from anywhere but a text box', () => {
    renderHook(useShortcuts);
    ctrlZ(field('<button>Frame</button>'));
    expect(getDoc().name).not.toBe('Changed');
  });

  it.each([
    ['a search box (the frame gallery)', '<input type="search">'],
    ['a text box', '<input>'],
    ['a number box', '<input type="number">'],
    ['a text area', '<textarea></textarea>'],
    ['an editable element', '<div contenteditable="true" tabindex="0"><span>x</span></div>'],
  ])('leaves %s its own undo', (_name, html) => {
    renderHook(useShortcuts);
    const el = field(html);
    ctrlZ(el.querySelector('span') ?? el);
    expect(getDoc().name).toBe('Changed');
  });

  it('does nothing behind a modal dialog', () => {
    renderHook(useShortcuts);
    document.body.innerHTML = '<div role="dialog" aria-modal="true"><button>Close</button></div>';
    ctrlZ(document.querySelector('button')!);
    expect(getDoc().name).toBe('Changed');
  });
});

describe('pasting', () => {
  it('imports a pasted picture', () => {
    renderHook(useGlobalImport);
    expect(paste(document.body, { image: true }).defaultPrevented).toBe(true);
    expect(imported).toHaveLength(1);
  });

  it('pastes text into a text box normally, even when the clipboard also holds a picture', () => {
    renderHook(useGlobalImport);
    const e = paste(field('<input aria-label="Label">'), { text: 'Goblin boss', image: true });
    expect(e.defaultPrevented).toBe(false);
    expect(imported).toEqual([]);
  });

  it('still imports a picture pasted into a text box when there is no text with it', () => {
    renderHook(useGlobalImport);
    paste(field('<input aria-label="Image or page link">'), { image: true });
    expect(imported).toHaveLength(1);
  });
});
