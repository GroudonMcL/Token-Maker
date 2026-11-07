// The site's library pictures (version 13): Token Maker's effect and
// decoration pictures (public/pictures/) and Frame Maker's roses, used as
// ornaments (a repeat's or a shape's element 'picture') and, for the ones
// that cover an area (stone, cracks…), as photo textures. The list is made by
// scripts/frame-maker/library-pictures.ts; sources and licences are in
// ASSETS-CREDITS.md.

import { LIBRARY_PICTURE_LIST } from './libraryPictureList';

export type LibraryPictureGroup = 'Roses' | 'Ornaments' | 'Treasure' | 'Creatures' | 'Trims' | 'Icons' | 'Effects' | 'Textures';

export interface LibraryPicture {
  id: string;
  name: string;
  group: LibraryPictureGroup;
  /** Starts coloured by the layer's colour (single-colour pictures); false keeps its own colours. */
  tint: boolean;
  /** Its starting colour. */
  color: string;
  /** Its average colour: drawn until it has loaded. */
  average: string;
  /** Width over height. */
  aspect: number;
}

export const LIBRARY_PICTURES: readonly LibraryPicture[] = LIBRARY_PICTURE_LIST;
export const LIBRARY_PICTURE_GROUPS: readonly LibraryPictureGroup[] = ['Roses', 'Ornaments', 'Treasure', 'Creatures', 'Trims', 'Icons', 'Effects', 'Textures'];
export const LIBRARY_PICTURE_IDS: readonly string[] = LIBRARY_PICTURES.map((p) => p.id);
/** The pictures that cover an area, offered as photo textures too. */
export const TEXTURE_PICTURES: readonly LibraryPicture[] = LIBRARY_PICTURES.filter((p) => p.group === 'Textures');
export const DEFAULT_LIBRARY_PICTURE = 'deco-rose-bloom';

export const libraryPictureById = (id: string) => LIBRARY_PICTURES.find((p) => p.id === id);
export const isLibraryPicture = (id: string) => libraryPictureById(id) !== undefined;
/** Where the browser finds it. */
export const libraryPictureUrl = (id: string) => `/pictures/${id}.webp`;
export const libraryPictureThumbUrl = (id: string) => `/pictures/thumbs/${id}.webp`;
