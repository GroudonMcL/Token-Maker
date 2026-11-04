// Reset buttons, fills with a paint, photo textures and the artwork credits, in the panels.
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createProject, repeatLayer, textureLayer } from '../project/defaults';
import { history, loadProject, select, undo } from '../state/projectStore';
import { PropertiesPanel } from './PropertiesPanel';
import { TextureDialog } from './TextureDialog';
import { WelcomeCard } from './WelcomeCard';

HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.open = true;
};

const top = () => history.getState().present.layers.at(-1)!;

describe('reset buttons', () => {
  it('put a slider back as a new layer has it, as one undo step, and rest when there is nothing to reset', async () => {
    const layer = { ...repeatLayer(), size: 0.7 };
    loadProject(createProject([layer]));
    select(layer.id);
    render(<PropertiesPanel />);
    const reset = screen.getByRole('button', { name: 'Reset Size' });
    expect(reset).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Reset Number' })).toBeDisabled();
    await userEvent.click(reset);
    expect(top()).toMatchObject({ size: repeatLayer().size });
    expect(screen.getByRole('button', { name: 'Reset Size' })).toBeDisabled();
    undo();
    expect(top()).toMatchObject({ size: 0.7 });
  });

  it('put a colour back too (a texture to its kind’s own colour)', async () => {
    const layer = { ...textureLayer('frost'), color: '#ff0000' };
    loadProject(createProject([layer]));
    select(layer.id);
    render(<PropertiesPanel />);
    await userEvent.click(screen.getByRole('button', { name: 'Reset Ice colour' }));
    expect(top()).toMatchObject({ color: textureLayer('frost').color });
  });
});

describe('fills with a paint', () => {
  it('a repeat can be filled with a paint, then a photo texture, each on its own', async () => {
    const layer = repeatLayer();
    loadProject(createProject([layer]));
    select(layer.id);
    render(<PropertiesPanel />);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Fill with' }), 'paint');
    expect(top()).toMatchObject({ fillPaint: { kind: 'lit', color: layer.fill } });
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Paint' }), 'picture');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Photo' }), 'lava');
    expect(top()).toMatchObject({ fillPaint: { kind: 'picture', picture: 'lava' } });
    // Ornaments lie flat on their photo: no "bend" for them.
    expect(screen.queryByRole('switch', { name: 'Bend round the band' })).toBeNull();
    await userEvent.click(screen.getByText('Paint each one on its own'));
    expect(top()).toMatchObject({ paintEach: true });
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Fill with' }), 'colour');
    expect(top()).toMatchObject({ fillPaint: null });
  });
});

describe('photo textures and credits', () => {
  it('the texture library offers the 32 photo textures as band fills', async () => {
    loadProject(createProject([]));
    render(<TextureDialog onClose={() => {}} />);
    const photos = screen.getByRole('region', { name: 'Photo textures' });
    expect(within(photos).getAllByRole('button')).toHaveLength(32);
    await userEvent.click(within(photos).getByRole('button', { name: 'Wood planks' }));
    expect(top()).toMatchObject({ type: 'bandFill', name: 'Wood planks', paint: { kind: 'picture', picture: 'wood-planks', bend: true } });
  });

  it('Help lists who made the artwork, with links', async () => {
    render(<WelcomeCard onClose={() => {}} onTemplates={() => {}} />);
    await userEvent.click(screen.getByText('Artwork credits'));
    expect(screen.queryByRole('link', { name: 'game-icons.net' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Poly Haven' })).toBeInTheDocument();
  });
});
