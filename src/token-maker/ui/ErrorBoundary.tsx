// Catches a part of the editor that fails to load or draw, so the rest keeps
// working instead of the whole page going blank. After the site is updated, a
// page left open can no longer fetch the old code for a section; reloading
// fixes that, and autosave keeps the token (it saves when the page closes).

import { Component, type ReactNode } from 'react';

interface Props {
  /** What to show instead; `retry` draws the children again. */
  fallback: (retry: () => void) => ReactNode;
  children: ReactNode;
  /** Called with the error, e.g. to make a failed lazy load start again. */
  onError?: (error: unknown) => void;
}

export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: unknown): void {
    console.error('Part of the editor failed', error);
    this.props.onError?.(error);
  }

  render(): ReactNode {
    return this.state.failed ? this.props.fallback(() => this.setState({ failed: false })) : this.props.children;
  }
}
