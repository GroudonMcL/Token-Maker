// The fonts text layers use, for drawing in node (tests and scripts); the
// browser loads the same files through @fontsource.
import { GlobalFonts } from '@napi-rs/canvas';
import { join } from 'node:path';
import { FONT_FAMILIES } from '../../src/frame-maker/render/text';

let done = false;
export function registerShippedFonts(): void {
  if (done) return;
  done = true;
  const files = join(process.cwd(), 'node_modules', '@fontsource');
  GlobalFonts.registerFromPath(join(files, 'grenze', 'files', 'grenze-latin-600-normal.woff2'), 'Grenze');
  GlobalFonts.registerFromPath(join(files, 'atkinson-hyperlegible', 'files', 'atkinson-hyperlegible-latin-700-normal.woff2'), 'Atkinson Hyperlegible');
  for (const f of Object.values(FONT_FAMILIES)) if (f.file) GlobalFonts.registerFromPath(join(process.cwd(), 'public', 'fonts', f.file), f.family);
}
