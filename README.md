# Token Maker

<https://tokenmaker.uk>

**Token Maker** and **Frame Maker** in one web app. Token Maker makes tokens for D&D and other tabletop RPGs; Frame Maker designs the frames that go round them. The app titles at the left of each app's top bar switch between the apps. Both stay open while you switch, so you lose nothing. The Themes button (a moon, or a sun for a light theme) in either app's top bar picks the theme for both apps: Dark unless another is picked; Light and Day are the light ones (`src/shell/palettes.css`).

**Sending a frame from Frame Maker to Token Maker:** in Frame Maker, click **Export**. On the main page (both apps together) the menu starts on **Frame for Token Maker**. Click **Send to Token Maker**. The page switches to Token Maker, which uses the design as the token's frame and keeps it in its list of Frame Maker designs (**Frame & shape → Frame type → Frame Maker**). Nothing is downloaded.

Everything runs in the browser, on the visitor's own device: no accounts, no analytics, no cookies.

Token Maker is free and open source under the [MIT licence](LICENSE).

## Running it

You need Node 22 or newer (`winget install OpenJS.NodeJS.LTS` on Windows).

```powershell
npm install
npx playwright install chromium   # only needed for the end-to-end tests
npm run dev
```

Open the address it prints (usually <http://localhost:5173>).

| Address | What it is |
|---|---|
| `/` | The main page: both apps, switched by the titles in their top bars |
| `/token-maker/` | Token Maker on its own (also `/token-maker/about`, `/token-maker/privacy`, `/token-maker/kit`) |
| `/frame-maker/` | Frame Maker on its own |

## Checking it works

| Command | What it does |
|---|---|
| `npm test` | Unit tests for both apps (Vitest; one project per app, each with its own set-up). |
| `npm run e2e` | End-to-end tests (Playwright): `e2e/shell` tests the main page and sending a frame; `e2e/token-maker` and `e2e/frame-maker` are each app's own tests, on each app's page. Add `--project=shell` (or `tm-desktop`, `fm-desktop`…) to run only some. |
| `npm run typecheck` | Checks the TypeScript. |
| `npm run lint` | ESLint. |
| `npm run build` | Builds the site into `dist/`, with three pages: `index.html`, `token-maker/index.html` and `frame-maker/index.html`. |
| `npm run preview` | Serves the built `dist/` folder. |
| `npm run tm:…` / `npm run fm:…` | Each app's drawing and sheet scripts (`tm:help-images`, `tm:frame-sheet`, `fm:frame-sheet`, `fm:screenshots`…). They are described in each app's docs. |

## Deploying

Cloudflare now builds new sites as **Workers** (Pages is the older option). In the Cloudflare dashboard:

1. **Workers & Pages → Create application → Import a repository** (or **GitHub**), and pick `Token-Maker`.
2. **Project name:** `token-maker`. It must match `name` in `wrangler.jsonc`.
3. **Build command:** `npm run build`. **Deploy command:** `npx wrangler deploy` (the default). Leave the root directory empty.
4. **Save and Deploy**, then open `https://token-maker.<your-account>.workers.dev`. Check `/api/health` shows `{"ok":true}`.

5. **Custom domain:** in the Worker's **Settings → Domains & Routes → Add → Custom domain**, add `tokenmaker.uk` (and `www.tokenmaker.uk` if wanted). The domain's DNS must be on Cloudflare.

Every push to `main` deploys again; other branches get a preview link. Node 22 comes from `.node-version`.

How it is set up: `wrangler.jsonc` serves `dist/` and runs `worker/index.ts` first for `/api/*` (Token Maker's image proxy for web imports) and `/token-maker/*` (so `/token-maker/about` gets Token Maker's own page, not the main page). `public/_headers` lets the site show its own pages in frames (`SAMEORIGIN`) and no other site can. Workers reads `_headers` too.

A Cloudflare **Pages** project still works: build command `npm run build`, output folder `dist`. `functions/` runs the image proxy there, and `functions/token-maker/` sends Token Maker's pages to Token Maker's own page. `public/_redirects` sends the old `/frame-studio/` addresses to `/frame-maker/`.

### The rename from Token Studio

The site was called Token Studio, and Frame Maker was Frame Studio. Frame Maker now saves `.framemaker.json` files; the old `.framestudio.json` files open as before. Some names inside saved files and the browser's storage still say `frame-studio` (the `frame-studio-project` file format, the `frame-studio:…` and `token-studio:app` storage keys), so files and settings people already have keep working. Don't rename those.

## How it fits together

```
index.html, src/shell/        The main page: each app in its own frame, the app switch and the themes both apps use.
                              Frames keep the apps' styles and keyboard shortcuts (Ctrl+Z…) apart.
token-maker/index.html        Token Maker's page   → src/token-maker/
frame-maker/index.html       Frame Maker's page  → src/frame-maker/
server/, functions/, worker/  Token Maker's image proxy for web imports
public/                       Fonts, backgrounds, pictures, help pictures and the favicon
scripts/token-maker/, scripts/frame-maker/   Each app's scripts
e2e/shell, e2e/token-maker, e2e/frame-maker  End-to-end tests
docs/token-maker/, docs/frame-maker/         Each app's design documents
```

Sending a frame: Frame Maker (`src/frame-maker/io/sendToTokenMaker.ts`) posts the project file's text, with its preview, to the main page. The page switches to Token Maker and passes it on as soon as Token Maker says it is ready (`src/token-maker/editor/shellBridge.ts`). Token Maker then opens it exactly like a `.framemaker.json` file. Messages are only accepted from the same site.

### The shared code copies

Each app still has its own copy of some of the other's code, carried over unchanged:

- `src/frame-maker/engine/legacy/` is a copy of Token Maker's frame renderer (`src/token-maker/render/`).
- `src/token-maker/frameMaker/` is a copy of Frame Maker's project reader and renderer.

Each copy has a `SOURCE.json`, and a test fails if a copied file is edited. Frame Maker's old `engine:sync` and `share:export` scripts, which copied these files between the two separate repositories, are not included. To update Token Maker's copy of Frame Maker after changing Frame Maker, run `npm run fm:share-copy` (add the paths of any new files the copied ones import, such as `render/newFile.ts`); it rewrites the engine's import path and the hashes in `SOURCE.json`. The engine copy is still updated by hand.

## Documents

- Token Maker's design: [`docs/token-maker/DESIGN.md`](docs/token-maker/DESIGN.md)
- Frame Maker's design: [`docs/frame-maker/DESIGN.md`](docs/frame-maker/DESIGN.md)
- Asset credits (fonts, pictures, textures and their licences, for both apps): [`ASSETS-CREDITS.md`](ASSETS-CREDITS.md)

## Bug reports and contact

For bug reports, privacy questions or takedown requests, message [u/CrystalFrogMaps](https://www.reddit.com/user/CrystalFrogMaps/) on Reddit, or open an issue on this repository.

## Licence

The code is under the [MIT licence](LICENSE). The bundled fonts, pictures and other assets keep their own licences, listed in [`ASSETS-CREDITS.md`](ASSETS-CREDITS.md). People using the site must have the rights to the pictures they upload or link to; see the Terms of use on Token Maker's Privacy page.
