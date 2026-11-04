// Whether this browser has seen the welcome card (ui/WelcomeCard.tsx).

export const WELCOMED_KEY = 'frame-studio:welcomed';

export function hasBeenWelcomed(): boolean {
  try {
    return localStorage.getItem(WELCOMED_KEY) === '1';
  } catch {
    return true;
  }
}

export function rememberWelcomed(): void {
  try {
    localStorage.setItem(WELCOMED_KEY, '1');
  } catch {
    // Storage can be blocked; the card simply shows again next time.
  }
}
