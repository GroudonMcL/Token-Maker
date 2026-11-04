// On Cloudflare Pages, Token Maker's own pages (/token-maker/about…) get
// Token Maker's own page rather than the main page. Files with an extension are
// served as they are. (A Workers deploy does the same in worker/index.ts.)
export const onRequestGet: PagesFunction = ({ request, env }) => {
  const url = new URL(request.url);
  if (url.pathname.includes('.')) return (env as { ASSETS: Fetcher }).ASSETS.fetch(request);
  return (env as { ASSETS: Fetcher }).ASSETS.fetch(new Request(new URL('/token-maker/', url), request));
};
