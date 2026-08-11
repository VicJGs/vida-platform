/// <reference types="vitest/config" />
// E1 (UI-3) — Vite config for @vida/editor. Mirrors @vida/ui: its PRIMARY job is to give Storybook's
// `@storybook/react-vite` builder a React plugin (Storybook 8+ no longer auto-adds `@vitejs/plugin-react`).
// It also becomes the config Vitest auto-loads, so `test.environment` is PINNED to 'node' to match @vida/ui's
// convention — the React component tests opt into jsdom per-file via `// @vitest-environment jsdom`.
// NB: NO `@tamagui/vite-plugin` — Tamagui runs untamed here (the @vida/ui decision), injecting runtime styles,
// which is all a Storybook gallery + jsdom test need.
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    // Provide the WebGL globals jsdom lacks BEFORE the test module graph loads — importing the @vida/ui barrel for
    // UIProvider transitively evaluates sigma (neural-graph), which reads static WebGL2RenderingContext.* at load.
    setupFiles: ['./src/test-setup.ts'],
  },
})
