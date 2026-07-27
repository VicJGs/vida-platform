import { defineConfig } from 'vite'
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
})
