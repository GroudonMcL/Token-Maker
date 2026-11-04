import type { ReactNode } from 'react';
import {
  Bookmark,
  Contrast,
  Download,
  Frame,
  Gem,
  ImagePlus,
  Maximize2,
  Mountain,
  Ruler,
  Scissors,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Tag,
  WandSparkles,
} from 'lucide-react';

/** Panel sections. Since the tool rail (owner request) they are reached through the tabs below. */
export type SectionId =
  | 'import'
  | 'image'
  | 'cutout'
  | 'background'
  | 'lighting'
  | 'shadows'
  | 'popout'
  | 'effects'
  | 'frame'
  | 'decorations'
  | 'size'
  | 'label'
  | 'presets'
  | 'export';

export interface SectionDef {
  id: SectionId;
  title: string;
  icon: ReactNode;
  /** One line shown in the empty placeholder until the section is built. */
  placeholder: string;
}

const icon = (C: typeof Download) => <C size={18} strokeWidth={1.75} />;

/** Every section, in the order the tabs show them. */
export const SECTIONS: readonly SectionDef[] = [
  { id: 'import', title: 'Import', icon: icon(ImagePlus), placeholder: 'Upload, drop, paste or link an image.' },
  { id: 'image', title: 'Colour', icon: icon(SlidersHorizontal), placeholder: 'Brightness, contrast and colour.' },
  { id: 'cutout', title: 'Cut-out', icon: icon(Scissors), placeholder: 'Remove the picture’s own background and tidy its edges.' },
  { id: 'popout', title: 'Pop-out', icon: icon(Maximize2), placeholder: 'Paint parts of the art over the border.' },
  { id: 'frame', title: 'Frame & shape', icon: icon(Frame), placeholder: 'Shape, border style, colour and thickness.' },
  { id: 'background', title: 'Background', icon: icon(Mountain), placeholder: 'A colour, gradient or picture behind the art.' },
  { id: 'lighting', title: 'Lighting', icon: icon(Sun), placeholder: 'Light direction, colour and presets.' },
  { id: 'shadows', title: 'Shadows', icon: icon(Contrast), placeholder: 'Drop, pop-out and inner shadows.' },
  { id: 'effects', title: 'Effects', icon: icon(Sparkles), placeholder: 'Glows, elements, conditions, atmosphere and overlays.' },
  { id: 'decorations', title: 'Decorations', icon: icon(Gem), placeholder: 'Gems, skulls, horns, wings and more.' },
  { id: 'label', title: 'Label', icon: icon(Tag), placeholder: 'Name banners, plaques, plain text and ring text.' },
  { id: 'size', title: 'Size', icon: icon(Ruler), placeholder: 'Tiny to Gargantuan, or a custom number of squares.' },
  { id: 'presets', title: 'Presets', icon: icon(Bookmark), placeholder: 'Built-in styles, your saved styles and sharing.' },
  { id: 'export', title: 'Export', icon: icon(Download), placeholder: 'Format, resolution, download and copy.' },
];

export type TabGroup = 'Art' | 'Look' | 'Finish';

/**
 * The panel's tabs: the tool rail on the left on desktop and tablet, the
 * scrolling tab row of the bottom sheet on phones (owner's choice of layout
 * A). A tab with more than one section shows them one at a time.
 */
export interface PanelTab {
  id: string;
  label: string;
  group: TabGroup;
  icon: ReactNode;
  sections: SectionId[];
}

export const TAB_GROUPS: readonly TabGroup[] = ['Art', 'Look', 'Finish'];

export const PANEL_TABS: readonly PanelTab[] = [
  { id: 'import', label: 'Import', group: 'Art', icon: icon(ImagePlus), sections: ['import'] },
  { id: 'colour', label: 'Colour', group: 'Art', icon: icon(SlidersHorizontal), sections: ['image'] },
  { id: 'cutout', label: 'Cut-out', group: 'Art', icon: icon(Scissors), sections: ['cutout'] },
  { id: 'background', label: 'Background', group: 'Art', icon: icon(Mountain), sections: ['background'] },
  { id: 'popout', label: 'Pop-out', group: 'Art', icon: icon(Maximize2), sections: ['popout'] },
  { id: 'frame', label: 'Frame', group: 'Look', icon: icon(Frame), sections: ['frame'] },
  { id: 'lighting', label: 'Light', group: 'Look', icon: icon(Sun), sections: ['lighting'] },
  { id: 'shadows', label: 'Shadow', group: 'Look', icon: icon(Contrast), sections: ['shadows'] },
  { id: 'effects', label: 'Effects', group: 'Look', icon: icon(WandSparkles), sections: ['effects'] },
  { id: 'decor', label: 'Decor', group: 'Look', icon: icon(Gem), sections: ['decorations'] },
  { id: 'label', label: 'Label', group: 'Look', icon: icon(Tag), sections: ['label'] },
  { id: 'size', label: 'Size', group: 'Finish', icon: icon(Ruler), sections: ['size'] },
  { id: 'presets', label: 'Presets', group: 'Finish', icon: icon(Bookmark), sections: ['presets'] },
  { id: 'export', label: 'Export', group: 'Finish', icon: icon(Download), sections: ['export'] },
];

export const sectionById = (id: SectionId) => SECTIONS.find((s) => s.id === id)!;
export const tabById = (id: string) => PANEL_TABS.find((t) => t.id === id)!;
export const tabOfSection = (id: SectionId) => PANEL_TABS.find((t) => t.sections.includes(id))!;
