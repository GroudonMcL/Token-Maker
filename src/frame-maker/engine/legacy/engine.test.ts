// @vitest-environment node
// The engine files are copies of token-maker's src/render/ and must stay
// byte for byte the same (DESIGN.md §3). Change them in token-maker, then run
// `npm run engine:sync -- ../token-maker`.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(join(here, 'SOURCE.json'), 'utf8')) as { files: Record<string, string> };

describe('copied token-maker engine', () => {
  it.each(Object.entries(manifest.files))('%s is unchanged', (file, hash) => {
    expect(createHash('sha256').update(readFileSync(join(here, file))).digest('hex')).toBe(hash);
  });
});
