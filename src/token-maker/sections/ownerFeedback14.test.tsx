// Owner feedback (v14): the light's blend mode, Keep inside with several
// choices (plus Pop-out and Outside), and the label's text shadow on by default.
import { fireEvent, render, screen, within } from '@testing-library/react';
import { newLabel } from '../document/defaults';
import { getDoc, resetDoc } from '../state/tokenStore';
import { EffectsSection } from './EffectsSection';
import { LightingSection } from './LightingSection';

beforeEach(() => resetDoc());

describe('Light tab: blend mode', () => {
  it('sits under Strength once something is lit, and is kept by the document', () => {
    render(<LightingSection />);
    expect(screen.queryByRole('combobox', { name: 'Blend mode' })).toBeNull();
    fireEvent.click(screen.getByRole('switch', { name: 'Background' }));
    const select = screen.getByRole('combobox', { name: 'Blend mode' });
    const strength = screen.getByRole('slider', { name: /^Strength/ });
    expect(strength.compareDocumentPosition(select) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.change(select, { target: { value: 'multiply' } });
    expect(getDoc().lighting.blend).toBe('multiply');
  });
});

describe('Keep inside: several at once', () => {
  it('Nothing clears the choices; the others turn on and off on their own', () => {
    render(<EffectsSection />);
    fireEvent.click(screen.getByRole('button', { name: /^Mist$/ }));
    const group = within(screen.getByRole('group', { name: 'Keep inside' }));
    expect(group.getByRole('button', { name: 'Nothing' })).toHaveAttribute('aria-pressed', 'true');
    for (const name of ['Token', 'Frame', 'Background', 'Art', 'Pop-out', 'Outside']) expect(group.getByRole('button', { name })).toBeInTheDocument();
    fireEvent.click(group.getByRole('button', { name: 'Outside' }));
    fireEvent.click(group.getByRole('button', { name: 'Frame' }));
    expect(getDoc().effects[0]!.clip).toEqual(['frame', 'outside']);
    expect(group.getByRole('button', { name: 'Nothing' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(group.getByRole('button', { name: 'Frame' }));
    expect(getDoc().effects[0]!.clip).toEqual(['outside']);
    fireEvent.click(group.getByRole('button', { name: 'Nothing' }));
    expect(getDoc().effects[0]!.clip).toEqual([]);
  });
});

describe('Label', () => {
  it('a new label has a text shadow: 60 % opacity, 0.6 % blur', () => {
    expect(newLabel().shadow).toMatchObject({ enabled: true, opacity: 0.6, blur: 0.012 });
  });
});
