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
  it('chooses a colour, then turns it and sets its breadth', () => {
    withArt();
    render(<ImageSection />);
    expect(screen.queryByRole('slider', { name: /New colour/ })).toBeNull();
    fireEvent.change(screen.getByLabelText('Colour to change'), { target: { value: '#c82828' } });
    expect(getDoc().art.adjust.recolorColor).toBe('#c82828');
    fireEvent.change(screen.getByRole('slider', { name: /New colour/ }), { target: { value: '90' } });
    fireEvent.change(screen.getByRole('slider', { name: /Breadth/ }), { target: { value: '60' } });
    expect(getDoc().art.adjust).toMatchObject({ recolorShift: 90, recolorBreadth: 60 });
    fireEvent.click(screen.getByRole('button', { name: 'Stop recolouring' }));
    expect(getDoc().art.adjust).toMatchObject({ recolorColor: null, recolorShift: 0 });
  });

  it('is kept by saved documents and checked when loaded', () => {
    const doc = createDocument();
    doc.art.adjust = { ...doc.art.adjust, recolorColor: '#C82828', recolorShift: 500, recolorBreadth: 40 };
    const back = migrateDocument(JSON.parse(JSON.stringify(doc)));
    expect(back.art.adjust).toMatchObject({ recolorColor: '#c82828', recolorShift: 180, recolorBreadth: 40 });
    const old = JSON.parse(JSON.stringify(createDocument()));
    delete old.art.adjust.recolorColor;
    expect(migrateDocument(old).art.adjust).toMatchObject({ recolorColor: null, recolorShift: 0, recolorBreadth: 30 });
  });
});
