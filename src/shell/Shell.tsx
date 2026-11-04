// The site's page (tokenmaker.uk): Token Maker and Frame Maker on one page. Each app runs in
// its own frame (so their styles and keyboard shortcuts stay apart). The app
// titles in each app's top bar switch between them (AppSwitch.tsx): the app
// asks this page to show the other one. A design Frame Maker sends is passed
// on to Token Maker, which uses it as the token's frame.

import { useEffect, useRef, useState } from 'react';

import { APPS, SHOW_APP_MESSAGE, type AppId } from './apps';
import { PALETTE_KEY, readPalette, applyPalette } from './palettes';

/** Messages between the shell and the apps (see the apps' shellBridge.ts and sendToTokenMaker.ts). */
const SEND_FRAME_MESSAGE = 'tokenmaker:send-frame';
const FRAME_MESSAGE = 'tokenmaker:frame';
const READY_MESSAGE = 'tokenmaker:token-maker-ready';

// Named before the site was renamed from Token Studio; kept so the saved choice still applies.
const APP_KEY = 'token-studio:app';

function savedApp(): AppId {
  try {
    const saved = localStorage.getItem(APP_KEY);
    // 'frame-studio' was Frame Maker's id before the rename.
    return saved === 'frame-maker' || saved === 'frame-studio' ? 'frame-maker' : 'token-maker';
  } catch {
    return 'token-maker';
  }
}

export function Shell() {
  const [app, setApp] = useState<AppId>(savedApp);
  // Frame Maker loads the first time it is shown; Token Maker always loads, so it can take frames.
  const [loaded, setLoaded] = useState<ReadonlySet<AppId>>(() => new Set(['token-maker', app]));
  const tokenMaker = useRef<HTMLIFrameElement>(null);
  const frameMaker = useRef<HTMLIFrameElement>(null);
  const tokenMakerReady = useRef(false);
  const waiting = useRef<string[]>([]);

  const show = (id: AppId) => {
    setApp(id);
    setLoaded((prev) => (prev.has(id) ? prev : new Set([...prev, id])));
    try {
      localStorage.setItem(APP_KEY, id);
    } catch {
      // Not remembered: fine.
    }
  };

  useEffect(() => {
    const origin = window.location.origin;
    const deliver = () => {
      const target = tokenMaker.current?.contentWindow;
      if (!tokenMakerReady.current || !target) return;
      for (const text of waiting.current.splice(0)) target.postMessage({ type: FRAME_MESSAGE, text }, origin);
    };
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== origin) return;
      const data = e.data as { type?: unknown; text?: unknown; app?: unknown } | null;
      const fromApp = e.source === tokenMaker.current?.contentWindow || e.source === frameMaker.current?.contentWindow;
      if (data?.type === SHOW_APP_MESSAGE && fromApp && APPS.some((a) => a.id === data.app)) {
        show(data.app as AppId);
      } else if (data?.type === READY_MESSAGE && e.source === tokenMaker.current?.contentWindow) {
        tokenMakerReady.current = true;
        deliver();
      } else if (data?.type === SEND_FRAME_MESSAGE && typeof data.text === 'string' && e.source === frameMaker.current?.contentWindow) {
        waiting.current.push(data.text);
        show('token-maker');
        deliver();
      }
    };
    // The theme also colours this page (seen while an app loads).
    const onStorage = (e: StorageEvent) => {
      if (e.key === PALETTE_KEY) applyPalette(readPalette());
    };
    window.addEventListener('message', onMessage);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('message', onMessage);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return (
    <div className="site">
      <main className="site__frames">
        {APPS.map(
          (a) =>
            loaded.has(a.id) && (
              <iframe
                key={a.id}
                ref={a.id === 'token-maker' ? tokenMaker : frameMaker}
                className="site__frame"
                title={a.title}
                src={a.src}
                data-active={app === a.id}
                // The hidden app can't be reached with the keyboard or a screen reader.
                inert={app !== a.id}
              />
            ),
        )}
      </main>
    </div>
  );
}
