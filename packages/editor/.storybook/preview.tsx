import type { Preview } from '@storybook/react-vite'
import { View } from '@tamagui/core'
import { UIProvider, type ThemeName } from '@vida/ui'

// E1 (UI-3) — global decorator roots every @vida/editor story in the real @vida/ui provider, driven by a `theme`
// toolbar global (the @vida/ui U0 precedent). UIProvider re-roots via TamaguiProvider `defaultTheme`, so switching the
// toolbar re-renders under light｜dark — the surface the component Visual Gate approves. The canvas is painted with the
// theme's page surface ($colorSurfacePrimary) so dark mode (light caret/text) is actually reviewable.
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
