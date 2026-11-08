/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { devApi } from './server/devApi.ts';

/** In `npm run dev` and `npm run preview`, Token Maker's own pages (/token-maker/about…) get Token Maker's own page. */
function tokenMakerPages(): Plugin {
  const rewrite = (req: { url?: string }, _res: unknown, next: () => void) => {
    const path = req.url?.split('?')[0] ?? '';
    if (/^\/token-maker\/[^.]+$/.test(path)) req.url = '/token-maker/index.html';
    next();
  };
  return {
    name: 'token-maker-pages',
    configureServer: (server) => void server.middlewares.use(rewrite),
    configurePreviewServer: (server) => void server.middlewares.use(rewrite),
  };
}

/**
 * Leaves ONNX Runtime's .wasm files out of the build. Bundling onnxruntime-web
 * makes Vite copy them into dist/assets, but transformers.js never loads them
 * from there: it points ONNX Runtime at the jsDelivr copy of the same version
 * (env.backends.onnx.wasm.wasmPaths). The biggest one is over 25 MiB, which is
 * more than Cloudflare Workers allows for a single asset, so deploys fail.
 */
function dropOnnxWasm(): Plugin {
  return {
    name: 'drop-onnx-wasm',
    apply: 'build',
    generateBundle(_options, bundle) {
      for (const name of Object.keys(bundle)) {
        if (/(^|\/)ort-wasm[^/]*\.wasm$/.test(name)) delete bundle[name];
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), devApi(), tokenMakerPages(), dropOnnxWasm()],
  // ES module workers, so a worker can load parts of itself when needed (the frame worker's photo textures).
  worker: { format: 'es' },
  build: {
    rollupOptions: {
      // The main page, and the two apps it shows.
      input: { main: 'index.html', tokenMaker: 'token-maker/index.html', frameMaker: 'frame-maker/index.html' },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    css: false,
    // Each app keeps its own test set-up.
    projects: [
      {
        extends: true,
        test: { name: 'token-maker', include: ['src/token-maker/**/*.test.{ts,tsx}', 'server/**/*.test.ts'], setupFiles: ['./src/token-maker/test/setup.ts'] },
      },
      {
        extends: true,
        test: { name: 'frame-maker', include: ['src/frame-maker/**/*.test.{ts,tsx}'], setupFiles: ['./src/frame-maker/test/setup.ts'] },
      },
      {
        extends: true,
        test: { name: 'shell', include: ['src/shell/**/*.test.{ts,tsx}'], setupFiles: ['./src/token-maker/test/setup.ts'] },
      },
    ],
  },
});
