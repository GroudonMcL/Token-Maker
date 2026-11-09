// @vitest-environment node
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PAGE_HEADERS, withPageHeaders } from './securityHeaders.ts';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

/** The headers public/_headers gives one path pattern. */
function headersFileBlock(pattern: string): Record<string, string> {
  const lines = read('public/_headers').split('\n');
  const start = lines.indexOf(pattern);
  expect(start, `${pattern} in public/_headers`).toBeGreaterThanOrEqual(0);
  const out: Record<string, string> = {};
  for (const line of lines.slice(start + 1)) {
    if (!/^\s+\S/.test(line)) break;
    const at = line.indexOf(':');
    out[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
  return out;
}

describe('security headers', () => {
  it('public/_headers gives every page the same headers as the Worker adds', () => {
    expect(headersFileBlock('/*')).toEqual(PAGE_HEADERS);
  });

  it("the policy allows each page's inline script, and nothing else inline", () => {
    const csp = PAGE_HEADERS['Content-Security-Policy']!;
    const scriptSrc = csp.split('; ').find((d) => d.startsWith('script-src '))!;
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    for (const page of ['index.html', 'token-maker/index.html', 'frame-maker/index.html']) {
      const inline = [...read(page).matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]!);
      expect(inline.length, page).toBeGreaterThan(0);
      for (const script of inline) {
        const hash = `'sha256-${createHash('sha256').update(script).digest('base64')}'`;
        expect(scriptSrc, `${page}: add ${hash} to script-src in server/securityHeaders.ts and public/_headers`).toContain(hash);
      }
    }
  });

  it('withPageHeaders keeps the response and adds the headers', async () => {
    const res = withPageHeaders(new Response('<p>hi</p>', { status: 201, headers: { 'Content-Type': 'text/html', 'X-Frame-Options': 'DENY' } }));
    expect(res.status).toBe(201);
    expect(await res.text()).toBe('<p>hi</p>');
    expect(res.headers.get('content-type')).toBe('text/html');
    expect(res.headers.get('x-frame-options')).toBe('SAMEORIGIN');
    expect(res.headers.get('content-security-policy')).toBe(PAGE_HEADERS['Content-Security-Policy']);
  });
});
