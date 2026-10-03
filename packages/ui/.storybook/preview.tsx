import type { Preview } from '@storybook/react-vite'
import { View } from '@tamagui/core'
import { UIProvider } from '../src/provider'
import type { ThemeDensity, ThemeMode, ThemePreset } from '../src/theme-resolution'

// U0 (UI-1) → fe-codec-theme S3 — global decorator roots every story in the real @vida/ui provider, now driven by the
// full CODEC selection (preset × mode × density) via three toolbar globals. UIProvider re-roots the theme (color) via
// TamaguiProvider `defaultTheme` AND applies the per-preset font vars + density CSS scale on <html> (provider.tsx) — so
// switching any toolbar control re-renders the whole tree under that cell. This is the S3 Visual-Gate surface: every
// story is reviewable across the 3 presets × light｜dark × calm｜dense matrix (the prior `theme` toolbar is superseded).
//
// U3 — the canvas is painted with the theme's page surface ($colorSurfacePrimary) so dark mode is reviewable (on-canvas
// light-in-dark content would be invisible on Storybook's white iframe). Benefits every story.
const preview: Preview = {
  decorators: [
    (Story, ctx) => (
      <UIProvider
        selection={{
          preset: ctx.globals.preset as ThemePreset,
          mode: ctx.globals.mode as ThemeMode,
          density: ctx.globals.density as ThemeDensity,
        }}
      >
        <View backgroundColor="$colorSurfacePrimary" padding="$16" minHeight="100vh">
          <Story />
        </View>
      </UIProvider>
    ),
  ],
  globalTypes: {
    preset: {
      description: 'Vida codec preset (token family + fonts)',
      toolbar: {
        title: 'Preset',
        icon: 'paintbrush',
        items: [
          { value: 'editorial', title: 'Editorial (default)' },
          { value: 'reader', title: 'The Reader' },
          { value: 'quietDesk', title: 'Quiet Desk' },
        ],
        dynamicTitle: true,
      },
    },
    mode: {
      description: 'Light｜dark scheme',
      toolbar: {
        title: 'Mode',
        icon: 'contrast',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
    density: {
      description: 'Calm｜dense air (spacing + type)',
      toolbar: {
        title: 'Density',
        icon: 'component',
        items: [
          { value: 'calm', title: 'Calm' },
          { value: 'dense', title: 'Dense' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { preset: 'editorial', mode: 'light', density: 'calm' },
}

export default preview
