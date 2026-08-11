import type { StorybookConfig } from '@storybook/react-vite'

// E1 (UI-3) — the component Visual-Gate render harness for @vida/editor (frontend-visual-gate.md render table).
// Mirrors @vida/ui: react-vite builder reuses ../vite.config.ts (React plugin); addon-a11y surfaces the §XIV a11y
// contract checks per story. Stories live beside the editor in src/**.
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.tsx'],
  addons: ['@storybook/addon-a11y'],
  framework: { name: '@storybook/react-vite', options: {} },
  core: { disableTelemetry: true },
  // Pre-bundle Tamagui's ESM packages up front (the editor story renders under @vida/ui's UIProvider, which pulls
  // @tamagui/core + @tamagui/animations-css). Without this, Vite discovers them lazily on the first story render and
  // re-optimizes (= a full page reload). Tamagui's Vite guide prescribes optimizeDeps.include; Storybook's documented
  // extension point is viteFinal + mergeConfig. See docs/specs/fixes/ui-1-storybook-slow-load/ (UI-1 precedent).
  async viteFinal(base) {
    const { mergeConfig } = await import('vite')
    return mergeConfig(base, {
      optimizeDeps: { include: ['@tamagui/core', '@tamagui/animations-css'] },
    })
  },
}

export default config
