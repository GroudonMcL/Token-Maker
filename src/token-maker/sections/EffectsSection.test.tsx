import { fireEvent, render, screen, within } from '@testing-library/react';
import { EFFECT_PICTURES } from '../render/pictureLibrary';
import { getDoc, resetDoc, undo } from '../state/tokenStore';
import { EffectsSection } from './EffectsSection';

describe('Effects section', () => {
  beforeEach(() => resetDoc());

  it('adds effects from the picker; the newest goes on top', () => {
    render(<EffectsSection />);
    fireEvent.click(screen.getByRole('button', { name: /^Outer glow$/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Mist$/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Vignette$/ }));
    expect(getDoc().effects.map((e) => [e.kind, e.placement])).toEqual([
      ['outerGlow', 'border'],
      ['mist', 'over'],
      ['vignette', 'over'],
    ]);
    const cards = within(screen.getByRole('list', { name: 'Effects, top first' })).getAllByRole('listitem');
    expect(cards.map((c) => c.getAttribute('data-effect'))).toEqual(['vignette', 'mist', 'outerGlow']);
  });

  it('opens a new effect and scrolls it into view, ready to edit', () => {
    const scrolled: string[] = [];
    // jsdom doesn't scroll; note what would be.
    Element.prototype.scrollIntoView = function (this: Element) {
      scrolled.push(this.getAttribute('data-effect') ?? '');
    };
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => (cb(0), 0));
    render(<EffectsSection />);
    fireEvent.click(screen.getByRole('button', { name: /^Smoke$/ }));
    expect(screen.getByRole('button', { name: /Smoke/, expanded: true })).toBeInTheDocument();
    expect(scrolled).toEqual(['smoke']);
    delete (Element.prototype as Partial<Element>).scrollIntoView;
    vi.restoreAllMocks();
  });

  it('lists the built-in pictures in the groups the drawn effects were in', () => {
    render(<EffectsSection />);
    const group = (name: string) => within(screen.getByRole('group', { name }));
    expect(group('Elemental').getByRole('button', { name: 'Fire' })).toBeInTheDocument();
    expect(group('Conditions').getByRole('button', { name: 'Blood spatter' })).toBeInTheDocument();
    expect(group('Conditions').getByRole('button', { name: 'Petrified' })).toBeInTheDocument();
    expect(group('Atmosphere').getByRole('button', { name: 'Lens flare' })).toBeInTheDocument();
    expect(group('Overlays').getByRole('button', { name: 'Cobwebs' })).toBeInTheDocument();
    // Each built-in picture is listed once.
    for (const p of EFFECT_PICTURES) expect(document.querySelectorAll(`[data-effect-picture="${p.id}"]`)).toHaveLength(1);
  });

  it('reorders, hides and removes effects, each one undo step', () => {
    render(<EffectsSection />);
    fireEvent.click(screen.getByRole('button', { name: /^Smoke$/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Mist$/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Move Smoke up' }));
    expect(getDoc().effects.map((e) => e.kind)).toEqual(['mist', 'smoke']);
    fireEvent.click(screen.getByRole('button', { name: 'Hide Mist' }));
    expect(getDoc().effects[0]!.visible).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Smoke' }));
    expect(getDoc().effects.map((e) => e.kind)).toEqual(['mist']);
    undo();
    expect(getDoc().effects.map((e) => e.kind)).toEqual(['mist', 'smoke']);
  });

  it('changes placement, and Shuffle picks a new layout', () => {
    render(<EffectsSection />);
    fireEvent.click(screen.getByRole('button', { name: /^Smoke$/ }));
    fireEvent.click(screen.getByRole('radio', { name: 'On border' }));
    expect(getDoc().effects[0]!.placement).toBe('border');
    fireEvent.click(screen.getByRole('button', { name: 'Advanced' }));
    const seed = getDoc().effects[0]!.seed;
    fireEvent.click(screen.getByRole('button', { name: 'Shuffle' }));
    expect(getDoc().effects[0]!.seed).not.toBe(seed);
  });

  it('shows its controls', () => {
    const { container } = render(<EffectsSection />);
    fireEvent.click(screen.getByRole('button', { name: /^Edge shadow$/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Advanced' }));
    expect(container.querySelectorAll('[data-control]').length).toBeGreaterThan(5);
  });
});
