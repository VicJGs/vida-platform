/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
  // wa-sqlite ships a WASM module + an ESM factory that locates its `.wasm`
  // via `import.meta.url`. Excluding it from dep pre-bundling keeps that
  // resolution intact; the sync build (`AccessHandlePoolVFS`) needs no COOP/COEP
  // headers because it uses no SharedArrayBuffer (AR-2, ADR-001).
  optimizeDeps: {
    exclude: ['wa-sqlite'],
  },
  assetsInclude: ['**/*.wasm'],
  worker: {
    format: 'es',
  },
  // AR-4: env-split tests. Default is `node` so AR-2's better-sqlite3 contract
  // test (a native addon, no DOM) is unperturbed; DOM tests (route render,
  // provider mount, worker-client RPC) opt into jsdom per-file via the
  // `// @vitest-environment jsdom` docblock. The live OPFS round-trip is a
  // Playwright follow-up (jsdom has no FileSystemSyncAccessHandle — LIF-103).
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    // Stub the WebGL globals BEFORE the test module graph loads — importing the @vida/ui barrel (UIProvider/
    // ToastProvider/media) transitively evaluates sigma (neural-graph), which reads static WebGL2RenderingContext.*
    // at load; jsdom/node lack it (UI-4 S1; the packages/editor precedent).
    setupFiles: ['./src/test-setup.ts'],
  },
})
