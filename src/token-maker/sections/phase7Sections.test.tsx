import 'fake-indexeddb/auto';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createDocument, newDecoration } from '../document/defaults';
import { selectDecoration } from '../editor/tools';
import { createPreset, presetToCode } from '../presets/preset';
import { savedPresets } from '../presets/presetStore';
import { getDoc, resetDoc, undo, updateDoc } from '../state/tokenStore';
import { DecorationsSection } from './DecorationsSection';
import { FrameSection } from './FrameSection';
import { PresetsSection } from './PresetsSection';

// Picture frames need a real browser to decode; pretend every frame is a ring with a round hole.
vi.mock('../state/frameLibrary', async (original) => ({
  ...(await original<typeof import('../state/frameLibrary')>()),
  prepareImageFrame: async (source: { type: 'library' | 'upload'; id: string }, name: string) => ({
    source,
    name,
    hole: [0.7, 0, 0, 0.7, -0.7, 0, 0, -0.7],
    outer: 0.95,
    nudge: { x: 0, y: 0, scale: 1 },
    found: true,
    open: false,
  }),
}));

const controlsShown = (container: HTMLElement) => expect(container.querySelectorAll('[data-control]').length).toBeGreaterThan(3);

beforeEach(() => {
  resetDoc();
  selectDecoration(null);
});

describe('Decorations section', () => {
  it('no longer offers the code-drawn class icons (owner removed them), but still shows ones a token already has', () => {
    updateDoc((d) => ({ ...d, decorations: [newDecoration('sword', 'a'), newDecoration('shield', 'b')] }));
    render(<DecorationsSection />);
    expect(screen.queryByRole('group', { name: 'Class icons' })).toBeNull();
    for (const name of ['Sword', 'Dagger', 'Shield', 'Staff', 'Bow', 'Holy symbol', 'Lute']) expect(screen.queryByRole('button', { name: new RegExp(`^${name}$`) })).toBeNull();
    const cards = within(screen.getByRole('list', { name: 'Decorations, top first' })).getAllByRole('listitem');
    expect(cards.map((c) => c.getAttribute('data-decoration'))).toEqual(['shield', 'sword']);
  });

  it('offers clipart pictures for treasure, creatures and trims (owner request)', () => {
    render(<DecorationsSection />);
    for (const [group, names] of [
      // Decoration art part 1: the first gem, round gem, crown, star and skull are retired.
      // Decoration review: cut stone is retired too.
      ['Treasure', ['Diamond', 'Round brilliant', 'Pearl', 'Circlet', 'Gold crown', 'Coronet', 'Gold star', 'Ornate star']],
      ['Creatures', ['Painted skull', 'Engraved skull', 'Skull and crossbones', 'Horn', 'Smooth horn', 'Wing', 'Gold wing', 'Silver wing']],
      // Decoration art part 2: the old laurel, chain and leaf are retired.
      ['Trims', ['Ribbon', 'Parchment scroll', 'Red sash', 'Gold laurel', 'Silver laurel', 'Oak sprig']],
    ] as const) {
      const tiles = within(screen.getByRole('group', { name: group })).getAllByRole('button');
      expect(tiles.map((t) => t.textContent)).toEqual(names);
      for (const t of tiles) expect(t.getAttribute('data-decoration-picture')).toMatch(/^deco-art-/);
    }
  });

  it('offers only the ornaments and pictures the owner kept (decoration review)', () => {
    render(<DecorationsSection />);
    const ornaments = within(screen.getByRole('group', { name: 'Ornaments' })).getAllByRole('button');
    expect(ornaments.map((t) => t.textContent)).toEqual([
      'Celtic vine corner', 'Corner decoration', 'Golden laurel', 'Gold victorian ring', 'Filigree circle', 'Corner flourish', 'Flourish divider', 'Laurel wreath',
    ]);
    // Every flat icon is retired; the group stays for the user's own pictures.
    const pictures = within(screen.getByRole('group', { name: 'Pictures' }));
    expect(pictures.queryAllByRole('button', { name: /Heart|Potion|Flag/ })).toEqual([]);
    expect(pictures.getByRole('button', { name: 'Use your own picture' })).toBeTruthy();
    const effects = within(screen.getByRole('group', { name: 'Effect pictures' })).getAllByRole('button');
    expect(effects.some((t) => t.getAttribute('data-decoration-picture') === 'fx-hearts-shine')).toBe(false);
  });

  it('moves it to another snap point or frees it, mirrors, removes, and undoes', () => {
    updateDoc((d) => ({ ...d, decorations: [newDecoration('shield', 's')] }));
    selectDecoration('s');
    render(<DecorationsSection />);
    const card = screen.getByRole('list', { name: 'Decorations, top first' });
    fireEvent.click(within(card).getByRole('radio', { name: 'Bottom left' }));
    expect(getDoc().decorations[0]!.place).toBe('bottomLeft');
    fireEvent.click(within(card).getByRole('switch', { name: 'Mirror on the other side' }));
    expect(getDoc().decorations[0]!.mirror).toBe(true);
    fireEvent.click(within(card).getByRole('switch', { name: 'Under the frame' }));
    expect(getDoc().decorations[0]!.underFrame).toBe(true);
    fireEvent.click(within(card).getByRole('radio', { name: 'Free' }));
    const d = getDoc().decorations[0]!;
    expect(d.place).toBe('free');
    expect(d.x).toBeLessThan(0); // stays where it was, on the bottom left
    expect(d.y).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Shield' }));
    expect(getDoc().decorations).toEqual([]);
    undo();
    expect(getDoc().decorations).toHaveLength(1);
  });

  it('shows its controls', () => {
    updateDoc((d) => ({ ...d, decorations: [newDecoration('shield', 's')] }));
    selectDecoration('s');
    const { container } = render(<DecorationsSection />);
    controlsShown(container);
  });
});

describe('Frame section: picture frames', () => {
  it('with no frames uploaded, Picture offers the built-in Essentials frames and an upload, and keeps the frame in use until one loads', () => {
    const { container } = render(<FrameSection />);
    const before = getDoc().frame;
    fireEvent.click(screen.getByRole('radio', { name: 'Picture' }));
    expect(screen.getByRole('button', { name: 'Upload a frame' })).toBeInTheDocument();
    expect(screen.getByText('Essentials')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Glowing lava' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reset the hole' })).toBeNull();
    expect(getDoc().frame).toEqual(before);
    expect(container.querySelectorAll('[data-control]').length).toBeGreaterThanOrEqual(3);
    fireEvent.click(screen.getByRole('radio', { name: 'Drawn' }));
    expect(getDoc().frame.kind).toBe('code');
  });
});

/** Picks a frame in the pop-out gallery by searching for its name. */
function pickFrame(name: string) {
  fireEvent.click(screen.getByRole('button', { name: 'Change frame' }));
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search frames' }), { target: { value: name } });
  fireEvent.click(screen.getByRole('radio', { name: new RegExp(`^${name}$`) }));
}

describe('Frame section: built-in Frame Maker designs (v11)', () => {
  it('lists them with the drawn frames, uses one with its band, and goes back to a drawn frame', () => {
    const { container } = render(<FrameSection />);
    const before = getDoc().frame.style;
    pickFrame('Rope');
    const frame = getDoc().frame;
    expect(frame.kind).toBe('design');
    expect(frame.design?.id).toBe('builtin:rope');
    expect(frame.design?.project.layers.length).toBeGreaterThan(0);
    expect(frame.thickness).toBe(0.14);
    // Still a drawn frame in the panel, without a colour (the design has its own).
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('radio', { name: 'Drawn' })).toBeChecked();
    expect(screen.getByTestId('current-frame')).toHaveTextContent('Rope');
    expect(screen.queryByText('Frame colour')).toBeNull();
    controlsShown(container);
    undo();
    // Back to the frame a new token starts with: the Simple design.
    expect(getDoc().frame.kind).toBe('design');
    expect(getDoc().frame.design?.id).toBe('builtin:simple');
    pickFrame('Celestial star');
    expect(getDoc().frame.outerSpacing).toBeGreaterThanOrEqual(0.14);
    pickFrame('Stamped');
    expect(getDoc().frame.kind).toBe('code');
    expect(getDoc().frame.style).toBe(before);
  });

  it('Frame Maker starts with no design rather than the built-in one', () => {
    render(<FrameSection />);
    pickFrame('Thorns');
    fireEvent.click(screen.getByRole('radio', { name: 'Frame Maker' }));
    expect(getDoc().frame.kind).toBe('design');
    expect(getDoc().frame.design).toBeNull();
  });

  it('lists every frame on its own, with no versions stacked behind another, opens on All frames, and closes with Escape', () => {
    render(<FrameSection />);
    fireEvent.click(screen.getByRole('button', { name: 'Change frame' }));
    expect(screen.getByRole('tab', { name: /All frames/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('radio', { name: /^Simple$/ })).toBeChecked();
    expect(screen.queryByRole('button', { name: /versions of/ })).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: /Metal & Gems/ }));
    fireEvent.click(screen.getByRole('radio', { name: /^Ember stamp$/ }));
    expect(getDoc().frame.design?.id).toBe('builtin:stamped-ember');
    expect(screen.getByTestId('current-frame')).toHaveTextContent('Metal & Gems');
    expect(screen.getByTestId('current-frame')).not.toHaveTextContent('version of');
    fireEvent.click(screen.getByRole('button', { name: 'Change frame' }));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('files every frame under its own broad category, with no class tabs', () => {
    render(<FrameSection />);
    fireEvent.click(screen.getByRole('button', { name: 'Change frame' }));
    const tabs = screen.getAllByRole('tab').map((t) => t.textContent ?? '');
    expect(tabs.some((t) => t.startsWith('Metal & Gems'))).toBe(true);
    expect(tabs.some((t) => /Classes|Classic|Textures|Crafted/.test(t))).toBe(false);
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search frames' }), { target: { value: 'cleric' } });
    expect(screen.queryByRole('radio', { name: /^Cleric$/ })).toBeNull();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search frames' }), { target: { value: '' } });
    fireEvent.click(screen.getByRole('tab', { name: /Sky & Stars/ }));
    expect(screen.getByRole('radio', { name: /^Starweave$/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^Dawn$/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /Metal & Gems/ }));
    expect(screen.getByRole('radio', { name: /^Holy light$/ })).toBeInTheDocument();
  });

  it('gives a built-in design a colour picker per colour slot and keeps the choice', () => {
    render(<FrameSection />);
    pickFrame('Starweave');
    expect(screen.getByText('Sky colour')).toBeInTheDocument();
    expect(screen.getByText('Sigils colour')).toBeInTheDocument();
    const before = JSON.stringify(getDoc().frame.design?.project);
    fireEvent.click(screen.getAllByRole('radio', { name: '#b8322a' })[0]);
    expect(getDoc().frame.design?.colours).toEqual({ band: '#b8322a' });
    expect(JSON.stringify(getDoc().frame.design?.project)).not.toBe(before);
  });
});

describe('Presets section', () => {
  beforeEach(() => savedPresets.setState({ presets: [], loaded: false }));

  it('applies a built-in preset as one undo step, keeping the art and name', () => {
    resetDoc({ ...createDocument('Goblin'), art: { ...createDocument().art, assetId: 'asset:g' } });
    render(<PresetsSection />);
    fireEvent.click(screen.getByRole('button', { name: /^Fiend$/ }));
    expect(getDoc().frame.presetId).toBe('infernal');
    expect(getDoc().decorations.map((d) => d.kind)).toEqual(['horn']);
    expect(getDoc().name).toBe('Goblin');
    expect(getDoc().art.assetId).toBe('asset:g');
    undo();
    expect(getDoc().frame.presetId).toBe('stamped');
  });

  it('saves the look, copies its code, and adds a pasted code', async () => {
    const writes: string[] = [];
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (t: string) => void writes.push(t) } });
    const { container } = render(<PresetsSection />);
    controlsShown(container);
    fireEvent.change(screen.getByLabelText('Save this look'), { target: { value: 'Blue thing' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    const list = await screen.findByRole('list', { name: 'Your presets' });
    expect(within(list).getByRole('button', { name: 'Blue thing' })).toBeInTheDocument();
    await act(async () => fireEvent.click(within(list).getByRole('button', { name: 'Copy the code for Blue thing' })));
    await waitFor(() => expect(writes[0]).toMatch(/^TKP1\./));
    // The code also shows in a box, for browsers that can't copy.
    expect(((await screen.findByTestId('preset-code')) as HTMLTextAreaElement).value).toBe(writes[0]);

    const shared = createDocument();
    shared.shape = 'hexagon';
    const code = await presetToCode(createPreset(shared, 'Hex friend'));
    fireEvent.change(screen.getByPlaceholderText(/Paste a preset code/), { target: { value: code } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Add the code' })));
    await waitFor(() => expect(getDoc().shape).toBe('hexagon'));
    expect(within(screen.getByRole('list', { name: 'Your presets' })).getByRole('button', { name: 'Hex friend' })).toBeInTheDocument();
  });
});
