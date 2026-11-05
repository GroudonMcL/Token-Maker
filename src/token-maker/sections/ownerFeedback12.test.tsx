// Owner feedback (v12): revert-to-default buttons, the Light tab's switches
// and presets, the Frame tab without backing or outer spacing, and the Size
// settings at the top of the Export tab.
import 'fake-indexeddb/auto';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { createDocument, DEFAULT_ADJUST, DEFAULT_LIGHTING } from '../document/defaults';
import { migrateDocument } from '../document/migrate';
import { resetSection } from '../layout/sectionResets';
import { getDoc, resetDoc, updateDoc } from '../state/tokenStore';
import { toolStore } from '../editor/tools';
import { ExportSection } from './ExportSection';
import { FrameSection } from './FrameSection';
import { LightingSection } from './LightingSection';

beforeEach(() => resetDoc());

describe('revert to default', () => {
  it('puts one tab’s settings back and leaves the rest', () => {
    updateDoc((d) => ({ ...d, art: { ...d.art, adjust: { ...d.art.adjust, brightness: 40 } }, lighting: { ...d.lighting, enabled: true, strength: 90 } }));
    resetSection('image');
    expect(getDoc().art.adjust).toEqual(DEFAULT_ADJUST);
    expect(getDoc().lighting.strength).toBe(90);
    resetSection('lighting');
    expect(getDoc().lighting).toEqual(DEFAULT_LIGHTING);
  });

  it('the frame’s reset keeps the outer spacing, which the Export tab’s reset puts back', () => {
    updateDoc((d) => ({ ...d, shape: 'hexagon', size: { preset: 'large', squares: 2 }, frame: { ...d.frame, kind: 'code', thickness: 0.3, outerSpacing: 0.4 } }));
    resetSection('frame');
    expect(getDoc().shape).toBe('circle');
    expect(getDoc().frame.thickness).toBe(createDocument().frame.thickness);
    expect(getDoc().frame.outerSpacing).toBe(0.4);
    resetSection('export');
    expect(getDoc().frame.outerSpacing).toBe(createDocument().frame.outerSpacing);
    expect(getDoc().size).toEqual(createDocument().size);
  });
});

describe('Light tab', () => {
  it('lights the art, frame and background with three switches under one label', () => {
    render(<LightingSection />);
    const group = screen.getByRole('group', { name: 'Light the…' });
    for (const name of ['Art', 'Frame', 'Background']) expect(within(group).getByRole('switch', { name })).toBeInTheDocument();
    fireEvent.click(within(group).getByRole('switch', { name: 'Background' }));
    expect(getDoc().lighting.background).toBe(true);
    expect(getDoc().lighting.enabled).toBe(false);
  });

  it('clicking the preset in use turns the light off again', () => {
    render(<LightingSection />);
    const torch = screen.getByRole('button', { name: /Torchlight/ });
    fireEvent.click(torch);
    expect(getDoc().lighting.preset).toBe('torchlight');
    expect(torch).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(torch);
    expect(getDoc().lighting).toEqual(DEFAULT_LIGHTING);
  });

  it('rim softness starts at 60 %', () => {
    expect(DEFAULT_LIGHTING.rim.softness).toBe(60);
  });
});

describe('Frame tab', () => {
  it('has no backing colour or outer spacing, and its three frame types are the same width', () => {
    const { container } = render(<FrameSection />);
    expect(screen.queryByText('Backing colour')).toBeNull();
    expect(screen.queryByRole('slider', { name: 'Outer spacing' })).toBeNull();
    expect(container.querySelector('.segmented__row--equal')).not.toBeNull();
  });

  it('Picture can be chosen with a Frame Maker design in use', () => {
    updateDoc((d) => ({ ...d, frame: { ...d.frame, kind: 'design', design: null } }));
    render(<FrameSection />);
    fireEvent.click(screen.getByRole('radio', { name: 'Picture' }));
    expect(screen.getByRole('radio', { name: 'Picture' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: 'Upload a frame' })).toBeInTheDocument();
  });
});

describe('Export tab', () => {
  it('starts with the size settings, outer spacing included, and gives the red square handles while open', () => {
    const { unmount } = render(<ExportSection />);
    expect(screen.getByRole('radiogroup', { name: 'Creature size' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Outer spacing' })).toBeInTheDocument();
    expect(toolStore.getState().editBounds).toBe(true);
    unmount();
    expect(toolStore.getState().editBounds).toBe(false);
  });

  it('offers 400, 512, 768 and 1024 pixels per square', () => {
    render(<ExportSection />);
    const px = screen.getByRole('radiogroup', { name: 'Pixels per square' });
    expect(within(px).getAllByRole('radio').map((r) => r.textContent)).toEqual(['400', '512', '768', '1024', 'Custom']);
  });
});

describe('v12 migration', () => {
  const v11 = (frame: object, background: object, lighting: object = {}) => {
    const d = createDocument();
    return { ...JSON.parse(JSON.stringify(d)), schemaVersion: 11, frame: { ...d.frame, ...frame }, background: { ...d.background, ...background }, lighting: { ...d.lighting, ...lighting } };
  };

  it('moves the backing colour into an empty background, so the token looks the same', () => {
    const doc = migrateDocument(v11({ backingColor: '#123456', backingOpacity: 0.5 }, { kind: 'none' }));
    expect(doc.background).toMatchObject({ kind: 'color', color: '#123456', opacity: 0.5 });
    expect(doc.frame.backingOpacity).toBe(0);
  });

  it('leaves a background that was chosen, and an empty one with no backing', () => {
    expect(migrateDocument(v11({ backingOpacity: 1 }, { kind: 'gradient' })).background.kind).toBe('gradient');
    expect(migrateDocument(v11({ backingOpacity: 0 }, { kind: 'none' })).background.kind).toBe('none');
  });

  it('keeps the background lit only where the art was lit', () => {
    expect(migrateDocument(v11({}, {}, { enabled: false, background: true })).lighting.background).toBe(false);
    expect(migrateDocument(v11({}, {}, { enabled: true, background: true })).lighting.background).toBe(true);
  });
});
