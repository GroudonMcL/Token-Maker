import { fireEvent, render, screen } from '@testing-library/react';
import { migrateDocument } from '../document/migrate';
import { createDocument } from '../document/defaults';
import { toolStore } from '../editor/tools';
import { getDoc, resetDoc, updateDoc } from '../state/tokenStore';
import { BackgroundSection } from './BackgroundSection';
import { ImageSection } from './ImageSection';
import { PopOutSection } from './PopOutSection';

const withArt = () =>
  updateDoc((d) => ({ ...d, art: { ...d.art, assetId: 'asset:test', transform: { ...d.art.transform, zoom: 1.4, offsetX: 0.2, offsetY: -0.1 } } }));

beforeEach(() => {
  resetDoc();
  toolStore.setState({ tool: 'move', autoTool: false });
});

describe('Pop-out', () => {
  it('turns the pop-out brush on while the section is open and off when it is left', () => {
    withArt();
    const { unmount } = render(<PopOutSection />);
    expect(toolStore.getState().tool).toBe('popout');
    unmount();
    expect(toolStore.getState().tool).toBe('move');
  });
});

describe('Background', () => {
  it('moves the picture on the canvas once one is chosen, and stops when the section is left', () => {
    withArt();
    updateDoc((d) => ({ ...d, background: { ...d.background, kind: 'image' } }));
    const { unmount } = render(<BackgroundSection />);
    expect(toolStore.getState().tool).toBe('move');
    fireEvent.click(screen.getByRole('radio', { name: "Token's art" }));
    expect(toolStore.getState().tool).toBe('background');
    unmount();
    expect(toolStore.getState().tool).toBe('move');
  });

  it("the token's art starts half blurred, lined up with the art, with Blur outside Advanced", () => {
    withArt();
    updateDoc((d) => ({ ...d, background: { ...d.background, kind: 'image' } }));
    render(<BackgroundSection />);
    fireEvent.click(screen.getByRole('radio', { name: "Token's art" }));
    expect(getDoc().background).toMatchObject({ image: { type: 'art' }, blur: 50, zoom: 1.4, offsetX: 0.2, offsetY: -0.1 });
    expect(screen.getByRole('slider', { name: /Blur/ })).toBeVisible();
    expect(screen.queryByRole('slider', { name: /Zoom/ })).toBeNull(); // in Advanced, closed
    fireEvent.click(screen.getByRole('button', { name: 'Advanced' }));
    expect(screen.getByRole('slider', { name: /Zoom/ })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: /Temperature/ })).toBeInTheDocument();
  });
});

describe('Recolour', () => {
  it('adds recolours, sets their colours and breadth, and removes them', () => {
    withArt();
    render(<ImageSection />);
    expect(screen.queryByRole('slider', { name: /Breadth/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Add a recolour' }));
    expect(getDoc().art.adjust.recolors).toEqual([{ from: '#ffffff', to: '#b8322a', breadth: 30 }]);
    fireEvent.change(screen.getByRole('slider', { name: /Breadth/ }), { target: { value: '60' } });
    expect(getDoc().art.adjust.recolors[0]!.breadth).toBe(60);
    fireEvent.click(screen.getByRole('button', { name: 'Add another recolour' }));
    expect(getDoc().art.adjust.recolors).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Remove recolour 1' }));
    expect(getDoc().art.adjust.recolors).toEqual([{ from: '#ffffff', to: '#b8322a', breadth: 30 }]);
  });

  it('sits below Advanced, which sits below the three main sliders', () => {
    withArt();
    const { container } = render(<ImageSection />);
    const after = (a: Element, b: Element) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    const saturation = screen.getByRole('slider', { name: /Saturation/ });
    const advanced = container.querySelector('[data-control="advanced"]')!;
    const recolour = container.querySelector('[data-control="recolour"]')!;
    expect(after(saturation, advanced)).toBe(true);
    expect(after(advanced, recolour)).toBe(true);
  });

  it('is kept by saved documents and checked when loaded; the old hue turn becomes a colour', () => {
    const doc = createDocument();
    doc.art.adjust = { ...doc.art.adjust, recolors: [{ from: '#C82828', to: '#zzzzzz', breadth: 400 }] };
    const back = migrateDocument(JSON.parse(JSON.stringify(doc)));
    expect(back.art.adjust.recolors).toEqual([{ from: '#c82828', to: '#ffffff', breadth: 100 }]);
    const v12 = { ...JSON.parse(JSON.stringify(createDocument())), schemaVersion: 12 };
    v12.art.adjust = { ...v12.art.adjust, recolorColor: '#c82828', recolorShift: 120, recolorBreadth: 40 };
    delete v12.art.adjust.recolors;
    expect(migrateDocument(v12).art.adjust.recolors).toEqual([{ from: '#c82828', to: '#28c828', breadth: 40 }]);
    const unused = { ...v12, art: { ...v12.art, adjust: { ...v12.art.adjust, recolorShift: 0 } } };
    expect(migrateDocument(unused).art.adjust.recolors).toEqual([]);
  });
});
