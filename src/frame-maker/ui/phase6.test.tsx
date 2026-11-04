// Phase 6 in the panels: the Effects section (adding, switching off, moving
// and removing effects), the style library, copying and pasting effects onto
// several layers, faceted shapes and the knockout switch.
import 'fake-indexeddb/auto';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { bandFillLayer, createProject, lineLayer, shapeLayer } from '../project/defaults';
import { STYLES } from '../project/styles';
import { findLayer } from '../project/tree';
import { history, loadProject, select, setMode, toggleSelect, ui, undo } from '../state/projectStore';
import { PropertiesPanel } from './PropertiesPanel';

HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.open = true;
};

const present = () => history.getState().present;
const layerOf = (id: string) => findLayer(present().layers, id)!;

describe('the Effects section', () => {
  const band = bandFillLayer();
  const line = lineLayer();
  beforeEach(() => {
    loadProject(createProject([band, line]));
    select(band.id);
    ui.setState({ copiedEffects: null });
  });

  it('adds an effect, switches it off, moves it and removes it, each one undo step', async () => {
    const user = userEvent.setup();
    render(<PropertiesPanel />);
    await user.selectOptions(screen.getByLabelText('Add an effect'), 'bevel');
    await user.selectOptions(screen.getByLabelText('Add an effect'), 'glow');
    expect(layerOf(band.id).effects.map((e) => e.kind)).toEqual(['bevel', 'glow']);
    expect(screen.getByLabelText('Bevel width')).toBeInTheDocument();

    await user.click(screen.getByRole('switch', { name: 'Bevel and surface' }));
    expect(layerOf(band.id).effects[0].on).toBe(false);
    expect(screen.queryByLabelText('Bevel width')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Move glow earlier' }));
    expect(layerOf(band.id).effects.map((e) => e.kind)).toEqual(['glow', 'bevel']);
    await user.click(screen.getByRole('button', { name: 'Remove glow' }));
    expect(layerOf(band.id).effects.map((e) => e.kind)).toEqual(['bevel']);
    undo();
    expect(layerOf(band.id).effects.map((e) => e.kind)).toEqual(['glow', 'bevel']);
  });

  it('the surface settings show only for a textured surface, and a material can be picked by name', async () => {
    const user = userEvent.setup();
    render(<PropertiesPanel />);
    await user.selectOptions(screen.getByLabelText('Add an effect'), 'bevel');
    expect(screen.queryByLabelText('Surface depth')).toBeNull();
    await user.selectOptions(screen.getByLabelText('Surface'), 'hammered');
    expect(screen.getByLabelText('Surface depth')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Add an effect'), 'recolour');
    await user.selectOptions(screen.getByLabelText('Material'), 'jade');
    const fx = layerOf(band.id).effects[1];
    expect(fx.kind === 'recolour' && fx.stops[0].color).toBe('#021208');
  });

  it('the style library shows every style, and picking one gives the layer its effects in one step', async () => {
    const user = userEvent.setup();
    render(<PropertiesPanel />);
    await user.click(screen.getByRole('button', { name: /Styles/ }));
    const dialog = screen.getByRole('dialog', { name: 'Styles' });
    for (const s of STYLES) expect(within(dialog).getByRole('button', { name: s.name })).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Polished gold' }));
    expect(screen.queryByRole('dialog', { name: 'Styles' })).toBeNull();
    expect(layerOf(band.id).effects.map((e) => e.kind)).toEqual(['bevel', 'recolour']);
    undo();
    expect(layerOf(band.id).effects).toEqual([]);
  });

  it('a style can be added after the effects already there', async () => {
    const user = userEvent.setup();
    render(<PropertiesPanel />);
    await user.selectOptions(screen.getByLabelText('Add an effect'), 'wear');
    await user.click(screen.getByRole('button', { name: /Styles/ }));
    const dialog = screen.getByRole('dialog', { name: 'Styles' });
    await user.click(within(dialog).getByRole('switch', { name: /Add to its effects/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Soft shadow' }));
    expect(layerOf(band.id).effects.map((e) => e.kind)).toEqual(['wear', 'shadow']);
  });

  it('copies effects and pastes them onto every picked layer', async () => {
    const user = userEvent.setup();
    render(<PropertiesPanel />);
    expect(screen.getByRole('button', { name: 'Paste effects' })).toBeDisabled();
    await user.selectOptions(screen.getByLabelText('Add an effect'), 'shadow');
    await user.click(screen.getByRole('button', { name: 'Copy effects' }));
    const shape = shapeLayer();
    act(() => {
      loadProject(createProject([band, line, shape]));
      select(line.id);
      toggleSelect(shape.id);
    });
    await user.click(screen.getByRole('button', { name: 'Paste effects' }));
    expect(layerOf(line.id).effects.map((e) => e.kind)).toEqual(['shadow']);
    expect(layerOf(shape.id).effects.map((e) => e.kind)).toEqual(['shadow']);
    // Each its own copy.
    expect(layerOf(line.id).effects[0]).not.toBe(layerOf(shape.id).effects[0]);
    undo();
    expect(layerOf(line.id).effects).toEqual([]);
  });

  it('a locked layer’s effects can’t be changed', () => {
    loadProject(createProject([{ ...band, locked: true }]));
    select(band.id);
    render(<PropertiesPanel />);
    expect(screen.getByRole('button', { name: /Styles/ })).toBeDisabled();
    expect(screen.getByLabelText('Add an effect')).toBeDisabled();
  });
});

describe('facets and the knockout', () => {
  afterEach(() => setMode('basic'));

  it('cutting a shape into facets shows its facet settings in place of shading', async () => {
    const shape = shapeLayer();
    loadProject(createProject([shape]));
    select(shape.id);
    const user = userEvent.setup();
    render(<PropertiesPanel />);
    expect(screen.queryByLabelText('Flat top')).toBeNull();
    await user.click(screen.getByRole('switch', { name: 'Cut into facets' }));
    expect(layerOf(shape.id)).toMatchObject({ faceted: true });
    expect(screen.getByLabelText('Flat top')).toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'Shaded by the light' })).toBeNull();
  });

  it('opacity and the blend mode are offered in Basic mode too', async () => {
    const shape = shapeLayer();
    loadProject(createProject([shape]));
    select(shape.id);
    const user = userEvent.setup();
    render(<PropertiesPanel />);
    await user.selectOptions(screen.getByLabelText('Blend mode'), 'screen');
    expect(layerOf(shape.id).blend).toBe('screen');
    expect(screen.getByLabelText('Opacity')).toBeInTheDocument();
  });

  it('the knockout switch makes the layer cut a hole, and hides the blend mode', async () => {
    const shape = shapeLayer();
    loadProject(createProject([shape]));
    select(shape.id);
    setMode('advanced');
    const user = userEvent.setup();
    render(<PropertiesPanel />);
    expect(screen.getByLabelText('Blend mode')).toBeInTheDocument();
    await user.click(screen.getByRole('switch', { name: 'Cut a hole in the layers below' }));
    expect(layerOf(shape.id).blend).toBe('destination-out');
    expect(screen.queryByLabelText('Blend mode')).toBeNull();
  });
});
