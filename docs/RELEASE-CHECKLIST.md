# Before going public

What to do before Token Maker goes public, from a review on 27 October 2026. When this review ran, `npm run typecheck`, `npm run lint`, `npm test` (1,920 tests) and `npm run build` all passed. The end-to-end tests (`npm run e2e`) were not run.

## 1. Art, credits and licences

- [ ] Replace the AI-made art: see [`AI-ART-REPLACEMENT.md`](AI-ART-REPLACEMENT.md) and the replacement pack.
- [ ] Afterwards, run `npm run tm:help-images` to redraw the help pictures. Also update the tests that compare pictures pixel for pixel (`libraryFiles.test.ts`, the frame and preset tests…).
- [x] Bring `ASSETS-CREDITS.md` up to date (done 1 November 2026: paths fixed, 32 photo textures listed one per row, Frame Maker's credits merged in). Still to do when art is replaced:
  - Remove the rows for art you replaced and add your own ("by GroudonMcL").
  - The "25 code-drawn frames" row says "Owner's own code". If the AI wrote that code, say so, or drop the row once the frames are replaced.
- [x] The **game-icons.net** ornaments were removed (1 November 2026); saved designs that used one get a drawn ornament instead.
- [x] The link to the old Frame-Maker repository's credits went with the game-icons.net row.
- [x] Choose a licence for the code: MIT (`LICENSE`). There is no `LICENSE` file, so the code is "all rights reserved" by default. That is fine if you mean it. If the repository is public and you want others to reuse the code, add an open licence (MIT, for example).
- [ ] Trademarks: "D&D" appears in the page descriptions. Mentioning it as a description ("for D&D and other tabletop RPGs") is normally fine. Don't use Wizards of the Coast's logos, and don't name the product after D&D.

## 2. Legal pages and contact

- [x] Add a **contact address** (u/CrystalFrogMaps on Reddit, at the bottom of the Privacy page and in the README) (email, GitHub Issues or Discord). People will want to report bugs, ask privacy questions and send copyright takedown requests.
- [x] Add short **Terms of use** (Privacy page: rights to pictures, no warranty). Not added yet:
  - Tokens are for personal use.
  - You will remove content if asked. Nothing is stored on the server, so this applies only to what the proxy fetches.
- [x] Privacy page: it said the site is "hosted on Cloudflare Pages"; it now says Cloudflare Worker. The README now deploys as a Cloudflare **Worker**, so correct the wording if that's how you deploy.
- [ ] No cookies and no analytics means no cookie banner is needed under UK GDPR/PECR. Adding analytics or switching on adverts (`VITE_FEATURE_ADS`) changes that: you would need to update the Privacy page and probably add a consent banner.
- [x] Web imports: the Pinterest-specific code was removed; a Pinterest link is now handled like any other page. Before: Pinterest's terms forbid scraping. Weigh that risk, and consider removing the Pinterest-specific code or keeping it to single pin links.

## 3. Security and abuse

- [x] Rate-limit `/api/*` properly (8 November 2026): deployed as a Worker, the proxy now uses Cloudflare's rate-limiting binding (`ratelimits` in `wrangler.jsonc`: 90 picture and 20 page requests a minute per IP), shared by every copy of the Worker in a Cloudflare location, not counted separately by each one. A **WAF rate-limiting rule** (Security → WAF) is still worth adding for a single global limit, but no longer urgent. A Pages deploy still has only the in-memory limiter.
- [ ] Set up **usage alerts or a spending cap** on the Cloudflare account. The free Workers plan allows 100,000 requests a day.
- [x] `/api/*` answers only requests from the site's own pages (8 November 2026): `Sec-Fetch-Site`, or `Referer`/`Origin` for older browsers. Requests without them (curl, scripts) get 403. Those headers can be faked, so the rate limit still matters.
- [x] The page scanner can no longer be made to run for seconds by broken HTML (8 November 2026): it was regular expressions that slowed down with the square of the page size (60 KB took 6 s); it is now a single pass.
- [ ] The proxy already blocks fetches to private addresses, size-limits responses and checks file types (`server/safeFetch.ts`, `ipRanges.ts`, `sniff.ts`). Leave that as it is.
- [x] Full **Content-Security-Policy**, **HSTS** and **COOP** (9 November 2026): in `public/_headers`, and added by the Worker and the Pages Function to the Token Maker pages they serve themselves. What the policy allows, and why, is in `server/securityHeaders.ts`; a test keeps `_headers` the same and checks the policy allows each page's inline theme script by its hash. Tested on the built site under `wrangler dev`: no violations on any page, and the AI cut-out downloads the model and runs. **If you add adverts, analytics or another outside script, add its hosts to the policy** or it will be blocked.
- [x] `npm audit`: upgraded to 4.3.1. Re-test the AI cut-out in a browser. Before: 4 high-severity advisories, all in `@huggingface/transformers`' Node-only dependencies (`sharp`, `onnxruntime-node`, `adm-zip`). None of them reach the browser bundle. Moving from 4.2.0 (pinned) to 4.3.1 clears them. Re-test the AI cut-out after the upgrade.

## 4. Performance

- [x] The 32 photo textures are separate files in `public/textures/` (10 November 2026), fetched one at a time when a design uses them and shared by both apps. They were a 2.2 MB chunk of text built three times (once per app, once for the frame worker).
- [x] The built-in frames no longer come with the first load (10 November 2026). Token Maker's first load carries only the starting frame (`config/defaultDesign.json`; run `npm run tm:default-design` if the Simple design changes) and fetches the catalogue when the frame gallery opens; Frame Maker fetches it when New or Add frame opens. First-load JavaScript and CSS: Token Maker 1,418 kB → 761 kB (330 → 248 kB gzipped), Frame Maker 1,355 kB → 671 kB (300 → 210 kB gzipped).
- [ ] Check the first load on a real phone over mobile data (Lighthouse or WebPageTest).
- [ ] The AI model (about 100 MB) downloads only when someone uses AI cut-out, and the page warns about it. Leave it as it is.

## 5. Deploying

- [ ] Choose a **name and a domain**, then add the domain in Cloudflare (Workers → Settings → Domains & Routes).
- [ ] Merge to `main` and check:
  - `https://<domain>/api/health` shows `{"ok":true}`
  - `/`, `/token-maker/`, `/token-maker/about`, `/token-maker/privacy` and `/frame-maker/` all open
  - a web import works on the live site
- [x] The PROGRESS.md files and other build-time documents were removed.
- [x] `apple-touch-icon` PNG added (`public/apple-touch-icon.png`, 180 × 180, linked from all three pages).
- [ ] Add social-share tags (`og:title`, `og:description`, `og:image`) and maybe a web manifest. At the moment the favicon is the only icon.
- [ ] Decide how you'll hear about errors. Cloudflare's Workers logs cover the proxy. Browser errors are invisible unless you add something, and that something must go on the Privacy page.

## 6. Testing on real devices

- [ ] Run `npm run e2e` (desktop, tablet and phone).
- [ ] Check by hand on iPhone Safari, Android Chrome, Firefox and desktop Safari. The Playwright tests run only in Chromium. Watch especially:
  - AI cut-out memory use on iPhone
  - copying to the clipboard
  - downloading ZIPs
  - IndexedDB storage in private windows
- [ ] Do a full pass as a new visitor: open the site, try a sample, upload a picture, style it, export it, reload (autosave), then send a frame from Frame Maker to Token Maker.
- [ ] Ask a few people from your group or community to try it before announcing it.

## 7. Launch and after

- [ ] Write a short changelog or version number, so people can report which version they're using.
- [ ] Set up a place for feedback (GitHub Issues, Discord or a subreddit post).
- [ ] Back up the repository, and turn on branch protection for `main` so a bad push doesn't deploy straight away.
