import type { Meta, StoryObj } from '@storybook/react-vite'
import { Text, View } from '@tamagui/core'

// U0 smoke story — the ONLY job here is to prove the harness renders the real Tamagui config in a browser
// and the theme toolbar visibly switches the surface (this is the first browser render of @vida/ui's config
// anywhere in the repo). Colors reference THEME tokens ($colorSurfacePrimary / $colorText*) so they MUST
// change on light↔dark toggle; layout uses raw numbers to keep the smoke free of token-resolution noise.
// Supplemented/replaced by real primitive stories from U1 onward.
function Welcome() {
  return (
    <View backgroundColor="$colorSurfacePrimary" padding={24} borderRadius={12} gap={8} maxWidth={520}>
      <Text color="$colorTextPrimary" fontSize={20}>
        Vida UI — Storybook harness (U0)
      </Text>
      <Text color="$colorTextMuted" fontSize={14}>
        Toggle the Theme control in the toolbar — this surface must switch between light and dark.
      </Text>
    </View>
  )
}

const meta = {
  title: 'Welcome',
  component: Welcome,
} satisfies Meta<typeof Welcome>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
