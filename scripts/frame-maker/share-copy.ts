// Copies Frame Maker's project reader and renderer into Token Maker's copy
// (src/token-maker/frameMaker/), so Token Maker draws designs that use
// what Frame Maker added, and records the copies' hashes in its SOURCE.json
// (the test there fails if a copy is edited by hand). Only the imports of
// Token Maker's own engine are rewritten: Frame Maker's copy of it is
// engine/legacy/, Token Maker's is src/token-maker/render/.
//   npm run fm:share-copy -- [new/file.ts …]
// New files Frame Maker's copied files import are added by naming them.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const from = join('src', 'frame-maker');
const to = join('src', 'token-maker', 'frameMaker');
const manifestPath = join(to, 'SOURCE.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { files: Record<string, string> };
const files = [...new Set([...Object.keys(manifest.files), ...process.argv.slice(2)])].sort();

for (const file of files) {
  const text = readFileSync(join(from, file), 'utf8').replaceAll("'../engine/legacy/", "'../../render/");
  writeFileSync(join(to, file), text);
  manifest.files[file] = createHash('sha256').update(text).digest('hex');
}
manifest.files = Object.fromEntries(Object.entries(manifest.files).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`${files.length} files copied to ${to}`);
