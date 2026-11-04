// The app titles in each app's top bar, in place of its own title. Inside
// Token Maker they switch between Token Maker and Frame Maker; on an app's
// own page there is nothing to switch to, so only its title shows.

import type { ReactNode } from 'react';
import { APPS, inSite, showApp, type AppId } from './apps';
import './shell-ui.css';

export function AppSwitch({ current, compact = false, logo, standalone }: { current: AppId; compact?: boolean; logo?: ReactNode; standalone: ReactNode }) {
  if (!inSite()) return <>{standalone}</>;
  return (
    <>
      {logo}
      <nav className={`app-switch${compact ? ' app-switch--compact' : ''}`} aria-label="Apps">
        {APPS.map((a) => (
          <button
            key={a.id}
            type="button"
            className="app-switch__app"
            aria-pressed={a.id === current}
            title={a.id === current ? undefined : `Switch to ${a.title}`}
            onClick={() => a.id !== current && showApp(a.id)}
          >
            {a.title}
          </button>
        ))}
      </nav>
    </>
  );
}
