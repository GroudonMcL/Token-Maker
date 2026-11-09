// @vitest-environment node
import type { LookupAddress } from 'node:dns';
import { describe, expect, it } from 'vitest';
import { checkHostWith } from './devApi.ts';
import { safeLookup } from './pinnedFetch.ts';

/** A DNS server that gives each answer in turn: a rebinding one answers public, then private. */
function dns(...answers: string[][]) {
  let call = 0;
  const resolve = (_host: string, _opts: unknown, cb: (err: Error | null, addresses: LookupAddress[]) => void) => {
    const list = answers[Math.min(call++, answers.length - 1)]!;
    queueMicrotask(() => cb(null, list.map((address) => ({ address, family: address.includes(':') ? 6 : 4 }))));
  };
  return { resolve, calls: () => call };
}

/** What a socket's lookup gets back. */
function lookUp(lookup: ReturnType<typeof safeLookup>, all = false) {
  return new Promise<{ err: (Error & { code?: string }) | null; result: unknown }>((done) =>
    (lookup as (h: string, o: object, cb: (err: Error | null, ...rest: unknown[]) => void) => void)('img.example', { all }, (err, ...rest) =>
      done({ err, result: all ? rest[0] : rest }),
    ),
  );
}

describe("the dev server's pinned DNS lookup", () => {
  it('gives sockets public addresses, in either form a socket asks for', async () => {
    const { resolve } = dns(['93.184.215.14', '2606:2800:21f:cb07:6820:80da:af6b:8b2c']);
    expect((await lookUp(safeLookup(resolve))).result).toEqual(['93.184.215.14', 4]);
    expect((await lookUp(safeLookup(resolve), true)).result).toEqual([
      { address: '93.184.215.14', family: 4 },
      { address: '2606:2800:21f:cb07:6820:80da:af6b:8b2c', family: 6 },
    ]);
  });

  it('refuses a name with any private address', async () => {
    const { resolve } = dns(['93.184.215.14', '10.0.0.5']);
    expect((await lookUp(safeLookup(resolve))).err?.code).toBe('EPRIVATE');
  });

  it('stops DNS rebinding: a name that passes the check but then points at the home network', async () => {
    const rebinding = dns(['93.184.215.14'], ['192.168.1.1']);
    // The check looks the name up first and is happy…
    await expect(checkHostWith(async () => [{ address: '93.184.215.14', family: 4 }])('img.example')).resolves.toBeUndefined();
    rebinding.resolve('img.example', { all: true }, () => {});
    // …but the lookup the connection itself uses gets the private answer, and refuses it.
    expect((await lookUp(safeLookup(rebinding.resolve))).err?.code).toBe('EPRIVATE');
    expect(rebinding.calls()).toBe(2);
  });
});
