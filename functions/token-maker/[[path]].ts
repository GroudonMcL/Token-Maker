// On Cloudflare Pages, Token Maker's own pages (/token-maker/about…) get
// Token Maker's own page rather than the main page. Files with an extension are
// served as they are. (A Workers deploy does the same in worker/index.ts.)
// The page gets the security headers too, as public/_headers may not reach a
// Function's answer.
import { withPageHeaders } from '../../server/securityHeaders.ts';

export const onRequestGet: PagesFunction = async ({ request, env }) => {
  const assets = (env as { ASSETS: Fetcher }).ASSETS;
  const url = new URL(request.url);
  if (url.pathname.includes('.')) return assets.fetch(request);
  return withPageHeaders(await assets.fetch(new Request(new URL('/token-maker/', url), request)));
};
