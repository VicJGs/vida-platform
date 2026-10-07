import type { Meta, StoryObj } from '@storybook/react-vite'
import { Text, View } from '@tamagui/core'
import { Button } from './components/button'
import { Card } from './components/card'

// fe-codec-theme S3 — the Visual-Gate specimen. NOT a shipped surface: a dense sampler that exercises every channel the
// codec swaps, reviewable across the 3 presets × light｜dark × calm｜dense matrix via the preview.tsx toolbar globals.
// Stable `id`s let the gate read getComputedStyle (font family per preset, padding per density) + compute AA contrast.
function CodecSpecimen() {
  return (
    <View id="codec-spec" gap="$16" maxWidth={720}>
      {/* Display + body type — proves the per-preset FONT family swap (display vs body families differ per preset). */}
      <Text id="spec-display" fontFamily="$display" fontSize="$displayLarge" color="$colorTextPrimary">
        The Editorial
      </Text>
      <Text id="spec-heading" fontFamily="$display" fontSize="$heading" color="$colorTextPrimary">
        A living journal, set in real type
      </Text>
      <Text id="spec-body" fontFamily="$body" fontSize="$body" color="$colorTextPrimary">
        Body copy in the body face. Density scales this size and its line-height together; the preset swaps the family.
        The quick brown fox jumps over the lazy dog — 0123456789.
      </Text>
      {/* Muted text on the page surface — the TIGHT AA-contrast pair (the warm dark surfaces are the constraint). */}
      <Text id="spec-muted" fontFamily="$body" fontSize="$small" color="$colorTextMuted">
        Muted secondary text — must hold ≥ 4.5:1 on every preset × mode.
      </Text>

      {/* A card on the secondary surface — `spacious` inset (a $space-scale variant) visibly tightens in dense. NB
          `padding` takes the Card enum (compact|default|spacious), NOT a raw space token — the old `padding="$16"`
          leaked through a now-fixed variant/style-prop collision (DEF-U5-h) and no longer applies. */}
      <Card id="spec-card" backgroundColor="$colorSurfaceSecondary" padding="spacious" gap="$8">
        <Text id="spec-card-text" fontFamily="$body" fontSize="$body" color="$colorTextPrimary">
          Card on the secondary surface — inset padding follows the density air.
        </Text>
      </Card>

      {/* Real primitives — accent color + focus ring per preset; text-on-brand contrast. */}
      <View id="spec-buttons" flexDirection="row" gap="$12" flexWrap="wrap">
        <Button intent="primary">Primary</Button>
        <Button intent="secondary">Secondary</Button>
        <Button intent="ghost">Ghost</Button>
        <Button intent="danger">Danger</Button>
      </View>
    </View>
  )
}

const meta = {
  title: 'Codec/Visual Gate',
  component: CodecSpecimen,
} satisfies Meta<typeof CodecSpecimen>

export default meta
type Story = StoryObj<typeof meta>

export const Specimen: Story = {}
