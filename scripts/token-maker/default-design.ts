// Writes the frame a new token starts with (the Essentials' Simple design)
// to src/token-maker/config/defaultDesign.json, so the first load carries
// only that one design and the rest of the frame catalogue loads when it is
// needed (render/frameCatalogue.ts). Run again if the Simple design changes;
// render/defaultDesign.test.ts fails when the file is out of date.
//   npm run tm:default-design
import { writeFileSync } from 'node:fs';
import { builtInBand, builtInDesignById, builtInDesignFrame } from '../../src/token-maker/render/builtInDesigns';
import { DEFAULT_DESIGN_ID } from '../../src/token-maker/render/defaultDesign';

const info = builtInDesignById(DEFAULT_DESIGN_ID)!;
const design = builtInDesignFrame(DEFAULT_DESIGN_ID)!;
const out = { info, band: builtInBand(DEFAULT_DESIGN_ID)!, project: design.project };
writeFileSync('src/token-maker/config/defaultDesign.json', `${JSON.stringify(out)}\n`);
console.log(`Wrote the ${info.name} design (${JSON.stringify(out).length} characters)`);
