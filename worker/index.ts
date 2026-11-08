// The same site as a Cloudflare Worker with static assets, for when it is
// deployed from the Workers screen instead of Pages (Cloudflare now shows
// Workers first). The built site in dist/ is served as it is; /api/* runs the
// same image proxy as the Pages Functions (functions/api/). Without this, a
// Workers deploy answers /api/* with the editor's own page and web imports fail.
// Settings: wrangler.jsonc. Pages ignores both files.

import { defaultLimits, handleFetchImage, handlePageImages, type ApiDeps, type Limiter } from '../server/api.ts';

interface Env {
  ASSETS: Fetcher;
  /** Cloudflare's rate limiters (`ratelimits` in wrangler.jsonc). Optional, so a deploy without them still works. */
  IMAGE_LIMITER?: RateLimit;
  PAGE_LIMITER?: RateLimit;
}

/**
 * Cloudflare's rate limiter, shared by every copy of the Worker in a
 * Cloudflare location, unlike the in-memory fallback that each copy keeps
 * for itself. It doesn't say how long to wait, so the full minute is given.
 */
function bindingLimiter(binding: RateLimit | undefined, fallback: Limiter): Limiter {
  if (!binding) return fallback;
  return { take: async (key) => ((await binding.limit({ key })).success ? 0 : 60) };
}

function apiDeps(env: Env): ApiDeps {
  return {
    limits: {
      image: bindingLimiter(env.IMAGE_LIMITER, defaultLimits.image),
      page: bindingLimiter(env.PAGE_LIMITER, defaultLimits.page),
    },
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith('/api/')) {
      if (request.method === 'GET' && pathname === '/api/fetch-image') return handleFetchImage(request, apiDeps(env));
      if (request.method === 'GET' && pathname === '/api/page-images') return handlePageImages(request, apiDeps(env));
      if (pathname === '/api/health') return Response.json({ ok: true });
      return Response.json({ error: { code: 'not_found', message: 'There is nothing at that address.' } }, { status: 404 });
    }
    // Token Maker's own pages (/token-maker/about…) get Token Maker's own page.
    if (pathname.startsWith('/token-maker/') && !pathname.includes('.')) return env.ASSETS.fetch(new Request(new URL('/token-maker/', request.url), request));
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
