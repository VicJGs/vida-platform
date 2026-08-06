import type { StorybookConfig } from '@storybook/react-vite'

// U0 (UI-1) — the component Visual-Gate render harness (frontend-visual-gate.md render table).
// react-vite builder reuses ../vite.config.ts (React plugin). addon-a11y surfaces the §XIV a11y
// contract checks per story. Stories live beside their primitives in src/**.
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.tsx'],
  addons: ['@storybook/addon-a11y'],
  framework: { name: '@storybook/react-vite', options: {} },
  core: { disableTelemetry: true },
  // Pre-bundle Tamagui's ESM packages up front. Without this, Vite discovers them lazily on the
  // first story render and re-optimizes (= a full page reload) — the "very slow" first load.
  // Tamagui's Vite guide prescribes optimizeDeps.include for its packages; Storybook's documented
  // extension point for it is viteFinal + mergeConfig. See docs/specs/fixes/ui-1-storybook-slow-load/.
  async viteFinal(base) {
    const { mergeConfig } = await import('vite')
    return mergeConfig(base, {
      optimizeDeps: { include: ['@tamagui/core', '@tamagui/animations-css'] },
    })
  },
}

export default config
