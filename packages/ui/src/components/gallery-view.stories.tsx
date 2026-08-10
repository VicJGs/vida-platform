import type { Meta, StoryObj } from '@storybook/react-vite'
import { Text, View } from '@tamagui/core'
import { GalleryView } from './gallery-view'
import { type ViewState } from './list-view'
import { Card } from './card'

// UI-2 · V2 · gallery-view stories — the component Visual Gate surface. Toggle the toolbar Theme (light｜dark).
// gallery-view is V1's spine with a responsive flex-wrap GRID (the imagery-first / vision-board layout, ADR-007).
// Tiles compose an interactive Card with a cover block (row/tile interactivity is the consumer's).
//
// MEASURE (v2-gallery-view.md §4): success grid of cover tiles · responsive wrap (resize the canvas → columns
// reflow, single column ~375) · minTileWidth (tiles grow to [min, 2·min]) · density gap · loading = N aspect-locked
// skeleton tiles (3:2, NO shimmer) · empty/error status messages · dark mode (base tokens cross).

type Item = { id: string; title: string; hue: string }
const ITEMS: Item[] = [
  { id: '0192-a', title: 'Sunrise hike', hue: '#f59e0b' },
  { id: '0192-b', title: 'City lights', hue: '#6366f1' },
  { id: '0192-c', title: 'Ocean dive', hue: '#06b6d4' },
  { id: '0192-d', title: 'Forest trail', hue: '#10b981' },
  { id: '0192-e', title: 'Desert road', hue: '#ef4444' },
  { id: '0192-f', title: 'Mountain peak', hue: '#8b5cf6' },
]

// A cover tile — an image-placeholder block + a title (the imagery-first gallery cell).
const tile = (i: Item) => (
  <Card interactive onPress={() => {}} padding="compact">
    <View height={120} borderRadius={8} backgroundColor={i.hue} marginBottom={8} />
    <Text fontFamily="$display" fontSize={14} fontWeight="600" color="$colorTextPrimary">
      {i.title}
    </Text>
  </Card>
)

const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View gap={8} marginBottom={24}>
    <Text fontSize={12} opacity={0.6} color="$colorTextPrimary">
      {label}
    </Text>
    {children}
  </View>
)

type PlaygroundArgs = {
  state: ViewState
  minTileWidth: number
  density: 'compact' | 'default' | 'spacious'
}

const meta: Meta<PlaygroundArgs> = {
  title: 'Platform Views/Gallery',
  argTypes: {
    state: { control: 'select', options: ['loading', 'empty', 'error', 'success'] },
    minTileWidth: { control: { type: 'range', min: 120, max: 320, step: 20 } },
    density: { control: 'select', options: ['compact', 'default', 'spacious'] },
  },
}
export default meta
type Story = StoryObj<PlaygroundArgs>

// Playground — resize the canvas to see the grid wrap; drive state/minTileWidth/density from controls.
export const Playground: Story = {
  args: { state: 'success', minTileWidth: 200, density: 'default' },
  render: (args) => (
    <View width={720} maxWidth="100%">
      <GalleryView<Item>
        items={ITEMS}
        getKey={(i) => i.id}
        renderItem={tile}
        state={args.state}
        minTileWidth={args.minTileWidth}
        density={args.density}
        aria-label="Photos"
      />
    </View>
  ),
}

// The four rendered terminal states.
export const TerminalStates: Story = {
  render: () => (
    <View gap={24} width={640} maxWidth="100%">
      <Section label="success (responsive cover grid)">
        <GalleryView<Item> items={ITEMS} getKey={(i) => i.id} renderItem={tile} aria-label="Photos" />
      </Section>
      <Section label="loading (6 aspect-locked skeleton tiles · no shimmer)">
        <GalleryView<Item> items={[]} getKey={(i) => i.id} renderItem={tile} state="loading" aria-label="Photos" />
      </Section>
      <View flexDirection="row" gap={24} flexWrap="wrap">
        <Section label="empty (role=status)">
          <View width={300}>
            <GalleryView<Item> items={[]} getKey={(i) => i.id} renderItem={tile} state="empty" />
          </View>
        </Section>
        <Section label="error (role=status)">
          <View width={300}>
            <GalleryView<Item> items={[]} getKey={(i) => i.id} renderItem={tile} state="error" />
          </View>
        </Section>
      </View>
    </View>
  ),
}

// minTileWidth — the tile floor; tiles grow to [min, 2·min] and wrap.
export const TileWidth: Story = {
  render: () => (
    <View gap={24} width={640} maxWidth="100%">
      {([140, 200, 280] as const).map((w) => (
        <Section key={w} label={`minTileWidth: ${w}`}>
          <GalleryView<Item> items={ITEMS} getKey={(i) => i.id} renderItem={tile} minTileWidth={w} aria-label="Photos" />
        </Section>
      ))}
    </View>
  ),
}

// Density — the grid gap.
export const Density: Story = {
  render: () => (
    <View gap={24} width={640} maxWidth="100%">
      {(['compact', 'default', 'spacious'] as const).map((d) => (
        <Section key={d} label={`density: ${d}`}>
          <GalleryView<Item> items={ITEMS.slice(0, 4)} getKey={(i) => i.id} renderItem={tile} density={d} aria-label="Photos" />
        </Section>
      ))}
    </View>
  ),
}
