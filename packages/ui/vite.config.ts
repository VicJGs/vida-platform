/// <reference types="vitest/config" />
// U0 (UI-1) — Vite config for @vida/ui. Its PRIMARY job is to give Storybook's `@storybook/react-vite`
// builder a React-plugin (Storybook 8+ no longer auto-adds `@vitejs/plugin-react`). It also becomes the
// config Vitest auto-loads, so `test.environment` is PINNED to 'node' to preserve the pre-existing test
// behavior (the 2 node-env `*.test.ts` runs) — this file must not silently change how the suite runs.
// NB: NO `@tamagui/vite-plugin` (optimizing compiler) — Tamagui runs untamed here; with React 19 it injects
// runtime styles via style tags, which is all a Storybook gallery needs. See docs/specs/components/ui-1-*.
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: { environment: 'node' },
})
