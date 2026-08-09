import type { Preview } from '@storybook/react-vite'
import { View } from '@tamagui/core'
import { UIProvider, type ThemeName } from '../src/provider'

// U0 (UI-1) — global decorator roots every story in the real @vida/ui provider, driven by a `theme`
// toolbar global. UIProvider re-roots via TamaguiProvider `defaultTheme` (provider.tsx), so switching the
// toolbar re-renders the whole tree under light｜dark — the exact surface the component Visual Gate approves
// (8 states × light｜dark). This proves the DS-4 switch mechanism works through Storybook's iframe.
//
// U3 — the canvas is painted with the theme's page surface ($colorSurfacePrimary: white light / navy dark) so
// dark mode is actually reviewable. Without it, on-canvas content like a Checkbox's label (correctly light in
// dark mode) is invisible on Storybook's default white iframe body. Benefits every story.
const preview: Preview = {
  decorators: [
    (Story, ctx) => (
      <UIProvider theme={ctx.globals.theme as ThemeName}>
        <View backgroundColor="$colorSurfacePrimary" padding="$16" minHeight="100vh">
          <Story />
        </View>
      </UIProvider>
    ),
  ],
  globalTypes: {
    theme: {
      description: 'Vida theme (light｜dark)',
      toolbar: {
        title: 'Theme',
        icon: 'contrast',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light' },
}

export default preview
