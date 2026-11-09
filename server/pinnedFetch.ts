// The dev server's fetch (server/devApi.ts): like fetch, but the DNS lookup
// that picks the address to connect to also refuses private addresses.
//
// Checking a hostname in DNS and then calling fetch looks it up twice. A DNS
// server that answers with a public address the first time and a private one
// the second ("DNS rebinding") gets past the check, and the image proxy
// reaches the computer's own network. Here the address that is checked is the
// one connected to. Cloudflare needs none of this: a Worker can't reach a
// private network.
//
// Only what safeFetch uses: GET, headers, a signal, redirects not followed.

import { lookup as dnsLookup, type LookupAddress } from 'node:dns';
import { request } from 'node:https';
import type { LookupFunction } from 'node:net';
import { Readable } from 'node:stream';
import { isBlockedAddress } from './ipRanges.ts';

type Resolve = (hostname: string, options: { all: true; family?: number }, callback: (err: Error | null, addresses: LookupAddress[]) => void) => void;

/** A DNS lookup for sockets that fails when any address for the name is private. */
export function safeLookup(resolve: Resolve = dnsLookup as unknown as Resolve): LookupFunction {
  return ((hostname: string, options: { all?: boolean; family?: number }, callback: (...args: unknown[]) => void) => {
    resolve(hostname, { all: true, family: options.family || undefined }, (err, addresses) => {
      if (err) return callback(err);
      if (!addresses.length || addresses.some((a) => isBlockedAddress(a.address))) {
        return callback(Object.assign(new Error(`${hostname} is on a private network`), { code: 'EPRIVATE' }));
      }
      if (options.all) return callback(null, addresses);
      callback(null, addresses[0]!.address, addresses[0]!.family);
    });
  }) as LookupFunction;
}

const NULL_BODY = new Set([101, 204, 205, 304]);

export const pinnedFetch: typeof fetch = (input, init) =>
  new Promise((resolve, reject) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const headers: Record<string, string> = { 'Accept-Encoding': 'identity' };
    new Headers(init?.headers).forEach((value, name) => (headers[name] = value));
    const req = request(url, { method: 'GET', headers, lookup: safeLookup(), signal: init?.signal ?? undefined }, (res) => {
      const out = new Headers();
      for (const [name, value] of Object.entries(res.headers)) {
        for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value]) out.append(name, v);
      }
      const status = res.statusCode ?? 502;
      if (NULL_BODY.has(status)) res.resume();
      const body = NULL_BODY.has(status) ? null : (Readable.toWeb(res) as ReadableStream<Uint8Array>);
      resolve(new Response(body, { status, statusText: res.statusMessage, headers: out }));
    });
    req.on('error', reject);
    req.end();
  });
