import 'fake-indexeddb/auto';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App';
import { FRAME_PRESETS } from '../engine/legacy/catalog';
import { canConvert } from '../project/convert';
import { categoryOf } from '../project/frameCategories';
import { bandFillLayer, createProject, legacyFrameLayer, lineLayer, repeatLayer, shapeLayer, TEXTURES, textureLayer } from '../project/defaults';
import { SAMPLE_LAYERED as LAYERED_TEMPLATES } from '../test/sampleDesigns';
import { history, loadProject, select, setMode, undo, updateStage } from '../state/projectStore';
import { LayersPanel } from './LayersPanel';
import { PropertiesPanel } from './PropertiesPanel';
import { TemplateDialog } from './TemplateDialog';
import { TextureDialog } from './TextureDialog';

// jsdom has no <dialog> methods.
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.open = true;
};

const rows = () => within(screen.getByRole('tree', { name: /Layers/ })).getAllByRole('treeitem');

describe('editor panels', () => {
  beforeEach(() => loadProject(createProject(LAYERED_TEMPLATES[0].make())));

  it('lists layers top first and shows the selected one’s settings', async () => {
    render(
      <>
        <LayersPanel onAddFrame={() => {}} onAddTexture={() => {}} />
        <PropertiesPanel />
      </>,
    );
    expect(rows().map((r) => r.textContent)).toEqual(expect.arrayContaining([expect.stringMatching(/^Beads/)]));
    expect(rows()[0].textContent).toMatch(/^Beads/);
    await userEvent.click(rows()[1]);
    expect(screen.getByText('Line', { selector: '.layer-kind' })).toBeInTheDocument();
  });

  it('hide, lock, duplicate, delete and reorder from the panel', async () => {
    render(<LayersPanel onAddFrame={() => {}} onAddTexture={() => {}} />);
    const top = () => history.getState().present.layers.at(-1)!;
    await userEvent.click(screen.getByRole('button', { name: 'Hide Beads' }));
    expect(top().visible).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: 'Lock Beads' }));
    expect(top().locked).toBe(true);
    await userEvent.click(rows()[0]);
    await userEvent.click(screen.getByRole('button', { name: 'Duplicate' }));
    expect(top().name).toBe('Beads copy');
    await userEvent.click(screen.getByRole('button', { name: 'Move down' }));
    expect(history.getState().present.layers.at(-2)!.name).toBe('Beads copy');
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(history.getState().present.layers.map((l) => l.name)).not.toContain('Beads copy');
  });

  it('renames with a double click', async () => {
    render(<LayersPanel onAddFrame={() => {}} onAddTexture={() => {}} />);
    await userEvent.dblClick(rows()[0]);
    const box = screen.getByRole('textbox', { name: 'Layer name' });
    await userEvent.clear(box);
    await userEvent.type(box, 'Studs{Enter}');
    expect(history.getState().present.layers.at(-1)!.name).toBe('Studs');
  });

  it('adds layers from the menu', async () => {
    render(<LayersPanel onAddFrame={() => {}} onAddTexture={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add layer' }));
    await userEvent.click(screen.getByRole('menuitem', { name: /Repeated shapes/ }));
    expect(history.getState().present.layers).toHaveLength(6);
  });

  it('changing a setting changes the project, and undo brings it back', async () => {
    render(<PropertiesPanel />);
    const before = history.getState().present;
    const number = screen.getByLabelText('Number value');
    await userEvent.clear(number);
    await userEvent.type(number, '36{Enter}');
    const beads = history.getState().present.layers.at(-1)!;
    expect(beads.type === 'repeat' && beads.count).toBe(36);
    history.getState().undo();
    expect(history.getState().present).toBe(before);
  });

  it('the template picker offers all the Token Maker frames', () => {
    render(<TemplateDialog mode="new" onClose={() => {}} />);
    for (const f of FRAME_PRESETS) expect(screen.getByRole('button', { name: f.name })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Blank project/ })).toBeInTheDocument();
    // Many role searches over a big dialog: slow when the machine is busy.
  }, 20_000);

  it('picking a frame in "add" mode adds it as a layer', async () => {
    render(<TemplateDialog mode="addFrame" onClose={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: 'Wizard' }));
    expect(history.getState().present.layers.at(-1)).toMatchObject({ type: 'legacyFrame', presetId: 'wizard' });
  });
});

describe('Phase 2 panels', () => {
  it('Ctrl+click two layers and group them; the group folds and unfolds', async () => {
    loadProject(createProject(LAYERED_TEMPLATES[0].make()));
    render(<LayersPanel onAddFrame={() => {}} onAddTexture={() => {}} />);
    const user = userEvent.setup();
    await user.click(rows()[0]);
    await user.keyboard('{Control>}');
    await user.click(rows()[1]);
    await user.keyboard('{/Control}');
    await user.click(screen.getByRole('button', { name: 'Group' }));
    const top = history.getState().present.layers.at(-1)!;
    expect(top.type === 'group' && top.children.map((c) => c.name)).toEqual(['Inner rim', 'Beads']);
    expect(rows()[0].textContent).toMatch(/Group of 2/);
    expect(rows()).toHaveLength(6);
    await user.click(screen.getByRole('button', { name: 'Fold Group' }));
    expect(rows()).toHaveLength(4);
    await user.click(screen.getByRole('button', { name: 'Ungroup' }));
    expect(history.getState().present.layers).toHaveLength(5);
  });

  it('a shape shows its own settings, including Place freely and Mirror', () => {
    loadProject(createProject([shapeLayer()]));
    render(<PropertiesPanel />);
    expect(screen.getByLabelText('Mirror')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Place freely' })).not.toBeChecked();
  });

  it('switching a line to wavy shows the wave settings', async () => {
    loadProject(createProject([lineLayer()]));
    render(<PropertiesPanel />);
    expect(screen.queryByText('Wave height')).toBeNull();
    await userEvent.click(screen.getByRole('switch', { name: 'Wavy' }));
    expect(screen.getByText('Wave height')).toBeInTheDocument();
  });

  it('a Token Maker frame says so when the light is moved', () => {
    loadProject(createProject([legacyFrameLayer('gilded')]));
    render(<PropertiesPanel />);
    expect(screen.queryByRole('note')).toBeNull();
    act(() => updateStage({ light: 45 }));
    expect(screen.getByRole('note')).toHaveTextContent(/always lit from the top left/);
  });
});

describe('textures (Phase 3)', () => {
  const top = () => history.getState().present.layers.at(-1)!;

  it('the Add layer menu opens the texture library', async () => {
    loadProject(createProject([bandFillLayer()]));
    const onAddTexture = vi.fn();
    render(<LayersPanel onAddFrame={() => {}} onAddTexture={onAddTexture} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add layer' }));
    await userEvent.click(screen.getByRole('menuitem', { name: /Texture…/ }));
    expect(onAddTexture).toHaveBeenCalled();
  });

  it('the library shows every texture and adds the one picked, with a band under it if asked', async () => {
    loadProject(createProject([]));
    const onClose = vi.fn();
    render(<TextureDialog onClose={onClose} />);
    for (const t of TEXTURES) expect(screen.getByRole('button', { name: t.name })).toBeInTheDocument();
    // An empty project gets a band too, by default, in one undo step.
    expect(screen.getByRole('switch', { name: /matching band colour/ })).toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: 'Hammered metal' }));
    expect(history.getState().present.layers.map((l) => l.type)).toEqual(['bandFill', 'texture']);
    expect(top()).toMatchObject({ type: 'texture', kind: 'hammered' });
    expect(history.getState().past).toHaveLength(1);
    expect(onClose).toHaveBeenCalled();
    // Finding each of the 35 tiles by its name takes a while.
  }, 20_000);

  it('a project with layers gets just the texture', async () => {
    loadProject(createProject([bandFillLayer()]));
    render(<TextureDialog onClose={() => {}} />);
    expect(screen.getByRole('switch', { name: /matching band colour/ })).not.toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: 'Starfield' }));
    expect(history.getState().present.layers.map((l) => l.type)).toEqual(['bandFill', 'texture']);
  });

  it('a texture shows its settings; changing the kind keeps its colour', async () => {
    loadProject(createProject([{ ...textureLayer('marble'), color: '#123456' }]));
    render(<PropertiesPanel />);
    for (const label of ['How many', 'Size', 'Strength', 'Variation', 'Where']) expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    await userEvent.selectOptions(screen.getByLabelText('Texture'), 'scatter');
    expect(top()).toMatchObject({ kind: 'scatter', color: '#123456', name: 'Stars' });
    expect(screen.getByText('Star colour')).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Where'), 'lit');
    expect(top()).toMatchObject({ where: 'lit' });
    const seed = (top() as { seed: number }).seed;
    await userEvent.click(screen.getByRole('button', { name: 'Shuffle' }));
    expect((top() as { seed: number }).seed).not.toBe(seed);
  });

  it('a band fill can be painted with colours round the ring', async () => {
    loadProject(createProject([bandFillLayer()]));
    render(<PropertiesPanel />);
    await userEvent.selectOptions(screen.getByLabelText('Paint'), 'ring');
    const paint = () => {
      const l = top();
      return l.type === 'bandFill' ? l.paint : null;
    };
    const stops = () => {
      const p = paint();
      return p?.kind === 'ring' ? p.stops : [];
    };
    // It starts from the metal lighting it was: twelve colours, 30° apart.
    expect(paint()).toMatchObject({ kind: 'ring', followLight: true });
    expect(stops()).toHaveLength(12);
    await userEvent.click(screen.getByRole('button', { name: 'Remove colour 12' }));
    await userEvent.click(screen.getByRole('button', { name: 'Add a colour' }));
    expect(stops().at(-1)!.angle).toBe(330);
    await userEvent.click(screen.getByRole('switch', { name: 'Turn with the light' }));
    expect(paint()).toMatchObject({ followLight: false });
  });
});

describe('converting Token Maker frames (Phase 4)', () => {
  const top = () => history.getState().present.layers.at(-1)!;
  afterEach(() => setMode('basic'));

  it('the template picker offers the converted frames as editable, and every original too', async () => {
    render(<TemplateDialog mode="new" onClose={() => {}} />);
    const editable = FRAME_PRESETS.filter((p) => canConvert(p.style));
    // Every frame but "No frame" (Arcane and Infernal share their drawing code).
    expect(editable.length).toBe(FRAME_PRESETS.length - 1);
    // Queried within their own sections: the dialog also lists every built-in design, so searching all of it is slow.
    const editableSection = within(screen.getByRole('region', { name: 'Token Maker frames as editable layers' }));
    for (const f of editable) expect(editableSection.getByRole('button', { name: `${f.name} Editable` })).toBeInTheDocument();
    for (const f of FRAME_PRESETS) expect(within(screen.getByRole('region', { name: categoryOf(f.id) })).getByRole('button', { name: f.name })).toBeInTheDocument();
    expect(editableSection.queryByRole('button', { name: 'No frame Editable' })).toBeNull();
    await userEvent.click(editableSection.getByRole('button', { name: 'Paladin Editable' }));
    const p = history.getState().present;
    expect(p.name).toBe('Paladin');
    expect(p.layers.map((l) => l.type)).not.toContain('legacyFrame');
    expect(p.layers.map((l) => l.name)).toContain('Gold crosses');
  }, 20_000);

  it('in "add" mode an editable frame is added as a group', async () => {
    loadProject(createProject([bandFillLayer()]));
    render(<TemplateDialog mode="addFrame" onClose={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: 'Polished Editable' }));
    expect(top()).toMatchObject({ type: 'group', name: 'Polished' });
  });

  it('a Token Maker frame layer turns into editable layers in its place, and undo brings it back', async () => {
    loadProject(createProject([bandFillLayer(), { ...legacyFrameLayer('paladin'), opacity: 0.7 }, lineLayer()]));
    const frameId = history.getState().present.layers[1].id;
    render(<PropertiesPanel />);
    act(() => select(frameId));
    await userEvent.click(screen.getByRole('button', { name: 'Turn into editable layers' }));
    const layers = history.getState().present.layers;
    expect(layers.map((l) => l.type)).toEqual(['bandFill', 'group', 'line']);
    expect(layers[1]).toMatchObject({ name: 'Paladin', opacity: 0.7 });
    expect(screen.getByText('Group', { selector: '.layer-kind' })).toBeInTheDocument();
    act(() => undo());
    expect(history.getState().present.layers[1]).toMatchObject({ type: 'legacyFrame', presetId: 'paladin' });
  });

  it('a frame without a converter ("No frame") says its parts can’t be edited, and offers no button', () => {
    loadProject(createProject([legacyFrameLayer('none')]));
    render(<PropertiesPanel />);
    expect(screen.getByText(/can't be edited one by one yet/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Turn into editable layers' })).toBeNull();
  });

  it('a repeat can be drawn flat and only every other one', async () => {
    loadProject(createProject([repeatLayer()]));
    render(<PropertiesPanel />);
    await userEvent.click(screen.getByRole('switch', { name: 'Shaded by the light' }));
    expect(top()).toMatchObject({ shaded: false });
    await userEvent.click(screen.getByRole('button', { name: 'Show: add a step' }));
    expect(top()).toMatchObject({ show: [true, false] });
    await userEvent.click(screen.getByRole('button', { name: 'Show: add a step' }));
    await userEvent.click(screen.getByRole('switch', { name: 'Show: step 2' }));
    expect(top()).toMatchObject({ show: [true, true, false] });
    await userEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(top()).toMatchObject({ show: [] });
  });

  it('a lit paint takes its own highlight colour, and a gradient can turn with the light (Advanced)', async () => {
    act(() => setMode('advanced'));
    loadProject(createProject([bandFillLayer()]));
    render(<PropertiesPanel />);
    const paint = () => {
      const l = top();
      return l.type === 'bandFill' ? l.paint : null;
    };
    await userEvent.click(screen.getByRole('switch', { name: 'Highlight colour' }));
    expect(paint()).toMatchObject({ kind: 'lit', highlight: expect.stringMatching(/^#[0-9a-f]{6}$/) });
    await userEvent.selectOptions(screen.getByLabelText('Paint'), 'linear');
    await userEvent.click(screen.getByRole('switch', { name: 'Turn with the light' }));
    expect(paint()).toMatchObject({ kind: 'linear', followLight: true });
    expect(screen.getByLabelText('Colour 1 opacity')).toBeInTheDocument();
  });
});

describe('the app', () => {
  it('opens with a frame and Basic mode hides the data view', async () => {
    render(<App />);
    expect(await screen.findByRole('img', { name: /Preview of/ })).toBeInTheDocument();
    expect(screen.queryByLabelText('Project data')).toBeNull();
    await userEvent.click(screen.getByRole('radio', { name: 'Advanced' }));
    expect(screen.getByText('Advanced: project data')).toBeInTheDocument();
  });
});
