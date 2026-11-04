import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import type { Gradient } from '../document/types';
import { useStore } from 'zustand';
import { ColorSwatches, GradientEditor, ImageStrip, SegmentedButtons, Section, Slider, TileGrid, Toggle } from '.';
import { createHistoryStore } from '../state/history';

describe('Slider', () => {
  function Harness({ store }: { store: ReturnType<typeof createHistoryStore<number>> }) {
    const [v, setV] = useState(store.getState().present);
    return (
      <Slider
        label="Brightness"
        min={-100}
        max={100}
        value={v}
        onChange={(n) => {
          setV(n);
          store.getState().set(n, { transient: true });
        }}
        onCommit={() => store.getState().commit()}
      />
    );
  }

  it('turns one drag into one undo step', () => {
    const store = createHistoryStore(0);
    render(<Harness store={store} />);
    const range = screen.getByRole('slider', { name: 'Brightness' });
    fireEvent.pointerDown(range);
    for (const v of [5, 10, 20, 40]) fireEvent.change(range, { target: { value: String(v) } });
    fireEvent.pointerUp(window);
    expect(store.getState().present).toBe(40);
    expect(store.getState().past).toEqual([0]);
  });

  it('accepts a typed number, clamped to the range', async () => {
    const store = createHistoryStore(0);
    render(<Harness store={store} />);
    const box = screen.getByRole('textbox', { name: 'Brightness value' });
    await userEvent.clear(box);
    await userEvent.type(box, '250{Enter}');
    expect(store.getState().present).toBe(100);
    expect(store.getState().past).toEqual([0]);
  });

  it('shows the current value', () => {
    render(<Slider label="Hue" min={0} max={10} value={7} onChange={() => {}} />);
    expect(screen.getByRole('textbox', { name: 'Hue value' })).toHaveValue('7');
  });

  it('marks the default value with a notch, and has no "?" button of its own', () => {
    const { container } = render(<Slider label="Hue" min={0} max={10} value={7} defaultValue={5} onChange={() => {}} />);
    expect(container.querySelector('.slider__notch')).toHaveStyle({ left: 'calc(var(--thumb) / 2 + (100% - var(--thumb)) * 0.5)' });
    // Its only button is the reset button.
    expect(screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual(['Reset Hue']);
  });

  it('has a reset button that puts the default back as one undo step, and is off at the default', async () => {
    const store = createHistoryStore(7);
    const Wired = () => {
      const v = useStore(store, (s) => s.present);
      return <Slider label="Hue" min={0} max={10} value={v} defaultValue={5} onChange={(x) => store.getState().set(x, { transient: true })} onCommit={() => store.getState().commit()} />;
    };
    render(<Wired />);
    await userEvent.click(screen.getByRole('button', { name: 'Reset Hue' }));
    expect(store.getState().present).toBe(5);
    expect(store.getState().past).toEqual([7]);
    expect(screen.getByRole('button', { name: 'Reset Hue' })).toBeDisabled();
  });

  it('has no reset button without a default value', () => {
    render(<Slider label="Hue" min={0} max={10} value={7} onChange={() => {}} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('Section', () => {
  it('collapses and expands, with a closed Advanced drop-down', async () => {
    render(
      <Section title="Image" advanced={<p>Hue stuff</p>}>
        <p>Main stuff</p>
      </Section>,
    );
    const toggle = screen.getByRole('button', { name: 'Image' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Main stuff')).not.toBeVisible();
    await userEvent.click(toggle);
    expect(screen.getByText('Main stuff')).toBeVisible();
    expect(screen.getByText('Hue stuff')).not.toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Advanced' }));
    expect(screen.getByText('Hue stuff')).toBeVisible();
  });
});

describe('SegmentedButtons', () => {
  it('selects with click and arrow keys', async () => {
    function H() {
      const [v, setV] = useState<'a' | 'b' | 'c'>('a');
      return (
        <SegmentedButtons
          label="Shape"
          value={v}
          onChange={setV}
          options={[
            { value: 'a', label: 'Circle' },
            { value: 'b', label: 'Hexagon' },
            { value: 'c', label: 'Square' },
          ]}
        />
      );
    }
    render(<H />);
    await userEvent.click(screen.getByRole('radio', { name: 'Hexagon' }));
    expect(screen.getByRole('radio', { name: 'Hexagon' })).toHaveAttribute('aria-checked', 'true');
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Square' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Square' })).toHaveFocus();
  });
});

describe('ColorSwatches', () => {
  it('picks a swatch and accepts a typed hex code', async () => {
    const onChange = vi.fn();
    render(<ColorSwatches label="Colour" value="#111111" swatches={['#111111', '#222222']} onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: '#222222' }));
    expect(onChange).toHaveBeenLastCalledWith('#222222');
    const hex = screen.getByRole('textbox', { name: 'Colour hex code' });
    await userEvent.clear(hex);
    await userEvent.type(hex, 'ABCDEF{Enter}');
    expect(onChange).toHaveBeenLastCalledWith('#abcdef');
  });
});

describe('GradientEditor', () => {
  const gradient = (): Gradient => ({
    type: 'linear',
    angle: 90,
    stops: [
      { offset: 0, color: '#000000', opacity: 1 },
      { offset: 1, color: '#ffffff', opacity: 1 },
    ],
  });
  function Harness({ onChange }: { onChange: (g: Gradient) => void }) {
    const [g, setG] = useState(gradient());
    return (
      <GradientEditor
        value={g}
        onChange={(next) => {
          setG(next);
          onChange(next);
        }}
        onCommit={() => {}}
      />
    );
  }

  it('has one marker per colour; clicking one opens its colour and opacity', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    expect(screen.getAllByRole('button', { name: /^Colour \d at/ })).toHaveLength(2);
    expect(screen.queryByTestId('gradient-stop-editor')).toBeNull();
    fireEvent.keyDown(screen.getByTestId('gradient-marker-1'), { key: 'Enter' });
    fireEvent.click(screen.getByTestId('gradient-marker-1'), { detail: 0 });
    expect(screen.getByTestId('gradient-stop-editor')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: '#b8322a' }));
    expect(onChange.mock.lastCall![0].stops[1].color).toBe('#b8322a');
    fireEvent.change(screen.getByRole('slider', { name: /Opacity/ }), { target: { value: '40' } });
    expect(onChange.mock.lastCall![0].stops[1].opacity).toBeCloseTo(0.4);
    // Two colours is the least a gradient can have.
    expect(screen.getByRole('button', { name: /Remove this colour/ })).toBeDisabled();
  });

  it('adds a colour where the bar is clicked, moves one with the arrow keys and removes it', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const bar = screen.getByTestId('gradient-bar');
    bar.getBoundingClientRect = () => ({ left: 0, width: 200, top: 0, height: 32, right: 200, bottom: 32, x: 0, y: 0, toJSON: () => ({}) });
    fireEvent.click(bar, { clientX: 100 });
    const added = onChange.mock.lastCall![0] as Gradient;
    expect(added.stops.map((s) => s.offset)).toEqual([0, 0.5, 1]);
    expect(added.stops[1]!.color).toBe('#808080');
    fireEvent.keyDown(screen.getByTestId('gradient-marker-1'), { key: 'ArrowRight', shiftKey: true });
    expect((onChange.mock.lastCall![0] as Gradient).stops[1]!.offset).toBeCloseTo(0.6);
    fireEvent.keyDown(screen.getByTestId('gradient-marker-1'), { key: 'Delete' });
    expect((onChange.mock.lastCall![0] as Gradient).stops).toHaveLength(2);
  });
});

describe('TileGrid and ImageStrip', () => {
  it('selects a tile', async () => {
    const onChange = vi.fn();
    render(
      <TileGrid
        label="Frame"
        value="a"
        onChange={onChange}
        tiles={[
          { id: 'a', label: 'Stamped', preview: null, group: 'Classic' },
          { id: 'b', label: 'Oak', preview: null, group: 'Textures' },
        ]}
      />,
    );
    expect(screen.getByText('Textures')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Oak' }));
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('shows an empty message with no images', () => {
    render(<ImageStrip label="Images" images={[]} value={undefined} onChange={() => {}} emptyText="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });
});

describe('Toggle', () => {
  it('is a switch', async () => {
    const onChange = vi.fn();
    render(<Toggle label="Batch" checked={false} onChange={onChange} />);
    await userEvent.click(screen.getByRole('switch', { name: 'Batch' }));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

