import 'fake-indexeddb/auto';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { newLabel, RING_TEXT_STYLE, SHAPE_TEXT_STYLE } from '../document/defaults';
import { FONTS } from '../fonts/catalog';
import { getDoc, resetDoc, undo, updateDoc } from '../state/tokenStore';
import { LabelSection } from './LabelSection';

const controlsShown = (container: HTMLElement) => expect(container.querySelectorAll('[data-control]').length).toBeGreaterThan(5);

beforeEach(() => resetDoc());

describe('Label section', () => {
  it('adds ring text showing the token name, and removes it again', () => {
    updateDoc((d) => ({ ...d, name: 'Goblin Boss' }));
    render(<LabelSection />);
    fireEvent.click(screen.getByRole('button', { name: 'Add a label' }));
    expect(getDoc().label).toEqual(newLabel());
    expect(screen.getByLabelText('Text')).toHaveAttribute('placeholder', 'Goblin Boss');
    fireEvent.click(screen.getByRole('switch', { name: 'Show a label' }));
    expect(getDoc().label).toBeNull();
    undo();
    expect(getDoc().label).not.toBeNull();
  });

  it('has every shape, Ring text first; a shape behind the text switches to dark letters with no outline, and back', () => {
    updateDoc((d) => ({ ...d, label: newLabel() }));
    const { container } = render(<LabelSection />);
    const shapes = within(screen.getByRole('radiogroup', { name: 'Shape' }));
    expect(shapes.getAllByRole('radio').map((r) => r.textContent)).toEqual(['Ring text', 'Banner', 'Plaque', 'Pill', 'Box', 'Plain text']);
    // No shape behind ring text, so no shape colour; it gets how much of the ring it may cover.
    expect(screen.queryByText('Shape colour')).toBeNull();
    expect(screen.getByText('Most of the ring it covers')).toBeInTheDocument();
    fireEvent.click(shapes.getByRole('radio', { name: 'Box' }));
    expect(getDoc().label).toMatchObject({ shape: 'box', ...SHAPE_TEXT_STYLE });
    expect(screen.getByRole('radiogroup', { name: 'Corners' })).toBeInTheDocument();
    fireEvent.click(shapes.getByRole('radio', { name: 'Ring text' }));
    expect(getDoc().label).toMatchObject({ shape: 'ring', ...RING_TEXT_STYLE });
    // A colour chosen by hand is kept.
    updateDoc((d) => ({ ...d, label: { ...d.label!, color: '#76ff4a' } }));
    fireEvent.click(shapes.getByRole('radio', { name: 'Banner' }));
    expect(getDoc().label?.color).toBe('#76ff4a');
    controlsShown(container);
  });

  it('the text box sets the words; emptied, the label shows the name again', () => {
    updateDoc((d) => ({ ...d, label: newLabel() }));
    render(<LabelSection />);
    const box = screen.getByLabelText('Text');
    fireEvent.change(box, { target: { value: 'The Boss' } });
    fireEvent.blur(box);
    expect(getDoc().label?.text).toBe('The Boss');
    fireEvent.change(box, { target: { value: '' } });
    fireEvent.blur(box);
    expect(getDoc().label?.text).toBeNull();
  });

  it('the font picker shows each font name in its own font', () => {
    updateDoc((d) => ({ ...d, label: newLabel() }));
    render(<LabelSection />);
    const picker = within(screen.getByRole('radiogroup', { name: 'Font' }));
    const items = picker.getAllByRole('radio');
    expect(items).toHaveLength(FONTS.length);
    for (const [i, f] of FONTS.entries()) {
      expect(items[i]).toHaveTextContent(f.name);
      expect(items[i]!.style.fontFamily).toContain(`tm-${f.id}`);
    }
    fireEvent.click(picker.getByRole('radio', { name: 'Pirata One' }));
    expect(getDoc().label?.font).toBe('pirata-one');
    expect(picker.getByRole('radio', { name: 'Pirata One' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: 'Upload a font' })).toBeInTheDocument();
  });

  it('bold, italic, alignment and position', () => {
    updateDoc((d) => ({ ...d, label: { ...newLabel(), shape: 'banner' } }));
    render(<LabelSection />);
    fireEvent.click(screen.getByRole('button', { name: 'Italic' }));
    expect(getDoc().label?.italic).toBe(true);
    fireEvent.click(screen.getByRole('radio', { name: 'Right' }));
    expect(getDoc().label?.align).toBe('right');
    const place = within(screen.getByRole('radiogroup', { name: 'Position' }));
    fireEvent.click(place.getByRole('radio', { name: 'Top' }));
    // A banner bends the other way at the top, so it hugs the ring there too.
    expect(getDoc().label).toMatchObject({ place: 'top', curve: -newLabel().curve });
    fireEvent.click(place.getByRole('radio', { name: 'Free' }));
    expect(getDoc().label?.place).toBe('free');
    expect(screen.getByText('Sideways')).toBeInTheDocument();
    expect(screen.getByText('Up or down')).toBeInTheDocument();
    // Free keeps it where it was: near the top of the token.
    expect(getDoc().label!.y).toBeLessThan(-0.5);
  });

  it('shrink to fit, a text outline, and letter spacing and a text shadow in Advanced', () => {
    updateDoc((d) => ({ ...d, label: { ...newLabel(), textOutline: { width: 0, color: '#040839' } } }));
    render(<LabelSection />);
    fireEvent.click(screen.getByRole('switch', { name: 'Shrink long names to fit' }));
    expect(getDoc().label?.shrinkToFit).toBe(false);
    // The text outline is in the main settings; its colour shows once it has a width.
    expect(screen.queryByText('Text outline colour')).toBeNull();
    fireEvent.change(screen.getByRole('slider', { name: /^Text outline/ }), { target: { value: '2' } });
    expect(getDoc().label?.textOutline.width).toBeCloseTo(0.04);
    expect(screen.getByText('Text outline colour')).toBeInTheDocument();
    // Letter spacing and the text shadow are back, in Advanced.
    expect(screen.getByText('Letter spacing')).not.toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Advanced' }));
    fireEvent.change(screen.getByRole('slider', { name: /^Letter spacing/ }), { target: { value: '20' } });
    expect(getDoc().label?.letterSpacing).toBeCloseTo(0.2);
    expect(screen.queryByText('Shadow colour')).toBeNull();
    fireEvent.click(screen.getByRole('switch', { name: 'Text shadow' }));
    expect(getDoc().label?.shadow.enabled).toBe(true);
    expect(screen.getByText('Shadow colour')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('slider', { name: /^Shadow opacity/ }), { target: { value: '30' } });
    expect(getDoc().label?.shadow.opacity).toBeCloseTo(0.3);
  });

  it('starts as ring text in Spectral, 7 % of a square, bold, #fff4dc with a 0.6 % #040839 outline (owner’s defaults)', () => {
    const l = newLabel();
    expect(l).toMatchObject({ shape: 'ring', font: 'spectral', color: '#fff4dc', bold: true, textOutline: { color: '#040839' } });
    expect(Math.round(l.size * 50 * 10) / 10).toBe(7);
    expect(Math.round(l.textOutline.width * 50 * 100) / 100).toBe(0.6);
    expect(FONTS[0]!.id).toBe('spectral');
  });
});
