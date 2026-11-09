import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { lazySection } from '../sections';
import { ErrorBoundary } from './ErrorBoundary';

describe('ErrorBoundary', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));
  afterEach(() => vi.restoreAllMocks());

  it('shows the fallback instead of a blank page, and the rest keeps working', () => {
    const Broken = () => {
      throw new Error('boom');
    };
    render(
      <>
        <button>Still here</button>
        <ErrorBoundary fallback={() => <p role="alert">Failed</p>}>
          <Broken />
        </ErrorBoundary>
      </>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Failed');
    expect(screen.getByRole('button', { name: 'Still here' })).toBeInTheDocument();
  });

  it('a section whose code failed to load can load again with Try again', async () => {
    let attempts = 0;
    const Section = lazySection(() => (++attempts === 1 ? Promise.reject(new Error('chunk missing')) : Promise.resolve({ default: () => <p>Loaded</p> })));
    await act(async () => void render(<Section />));
    expect(await screen.findByRole('alert')).toHaveTextContent("couldn't be loaded");
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Loaded')).toBeInTheDocument();
    expect(attempts).toBe(2);
  });
});
