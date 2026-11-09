// The security headers every page of the site gets.
//
// public/_headers sets them on the files Cloudflare serves straight from
// dist/. Pages the Worker answers itself (/token-maker/about…, see
// worker/index.ts) may not get _headers, so the Worker adds these too.
// securityHeaders.test.ts keeps public/_headers the same as this list and
// checks that the policy allows the theme script inlined in each page.
//
// What the Content-Security-Policy allows, and why:
// - script-src: the site's own scripts; the theme script in each page's
//   <head> (by its hash: src/shell/palettes.ts, THEME_SCRIPT); WebAssembly;
//   and the AI cut-out's ONNX runtime, which transformers.js downloads from
//   jsDelivr and imports from a blob: URL (src/token-maker/image/ai.worker.ts).
// - connect-src https: web imports fetch pictures straight from their own
//   sites when the site allows it, and the AI model comes from Hugging Face
//   (which redirects to its file servers).
// - img-src https: pictures found on a web page are shown from their sites.
// - style-src 'unsafe-inline': React and the canvas code set inline styles.
// Adverts (VITE_FEATURE_ADS) would need their own hosts adding.

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'sha256-zs6CEk6eruKJk2HsKt7c4j4FYl/Gw9upI96z5q43czM=' 'wasm-unsafe-eval' blob: https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: blob:",
  "connect-src 'self' https: data: blob:",
  "worker-src 'self' blob:",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join('; ');

export const PAGE_HEADERS: Readonly<Record<string, string>> = {
  'Content-Security-Policy': CSP,
  'Strict-Transport-Security': 'max-age=31536000',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

/** A copy of the response with the page headers added. */
export function withPageHeaders(response: Response): Response {
  const out = new Response(response.body, response);
  for (const [name, value] of Object.entries(PAGE_HEADERS)) out.headers.set(name, value);
  return out;
}
