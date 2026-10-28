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

type Item = { id: string; title: string; hue: string; kicker: string; caption: string; weight?: number }
const ITEMS: Item[] = [
  { id: '0192-a', title: 'Sunrise hike', hue: '#f59e0b', kicker: 'Trip', caption: '12 photos', weight: 2 },
  { id: '0192-b', title: 'City lights', hue: '#6366f1', kicker: 'Urban', caption: '8 photos' },
  { id: '0192-c', title: 'Ocean dive', hue: '#06b6d4', kicker: 'Dive', caption: '21 photos' },
  { id: '0192-d', title: 'Forest trail', hue: '#10b981', kicker: 'Trip', caption: '5 photos' },
  { id: '0192-e', title: 'Desert road', hue: '#ef4444', kicker: 'Drive', caption: '17 photos' },
  { id: '0192-f', title: 'Mountain peak', hue: '#8b5cf6', kicker: 'Climb', caption: '9 photos', weight: 2 },
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

// The EDITORIAL tile (P4 mockup look) — a PLAIN composition (tile CONTENT is the consumer's, GV-1): a framed cover with
// a kicker overlay + a serif title + a tabular caption. NOT gallery-view code; it just shows what a refined renderItem
// looks like so the Visual Gate sees the full editorial gallery + the weight emphasis.
const editorialTile = (i: Item) => (
  <View>
    <View
      height={140}
      borderRadius="$lg"
      backgroundColor={i.hue}
      position="relative"
      overflow="hidden"
      borderWidth={1}
      borderColor="$colorBorderDefault"
    >
      <View
        position="absolute"
        left={8}
        top={8}
        backgroundColor="$colorSurfacePrimary"
        borderRadius="$sm"
        paddingHorizontal={6}
        paddingVertical={2}
      >
        <Text
          className="vida-gtile-kicker"
          fontFamily="$body"
          fontSize="$caption"
          fontWeight="700"
          letterSpacing={0.8}
          textTransform="uppercase"
          color="$colorTextMuted"
        >
          {i.kicker}
        </Text>
      </View>
    </View>
    <Text
      className="vida-gtile-title"
      fontFamily="$display"
      fontSize="$small"
      fontWeight="500"
      color="$colorTextPrimary"
      marginTop={8}
    >
      {i.title}
    </Text>
    <Text
      className="vida-gtile-caption"
      fontFamily="$body"
      fontSize="$caption"
      letterSpacing={0.4}
      textTransform="uppercase"
      color="$colorTextMuted"
      marginTop={2}
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {i.caption}
    </Text>
  </View>
)

const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View gap={8} marginBottom={24}>
    {/* solid muted token (AA-safe) — NOT primary@opacity, which composites < 4.5 on warm-light surfaces */}
    <Text fontSize={12} color="$colorTextMuted">
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
          <GalleryView<Item>
            items={ITEMS}
            getKey={(i) => i.id}
            renderItem={tile}
            minTileWidth={w}
            aria-label="Photos"
          />
        </Section>
      ))}
    </View>
  ),
}

// P4 — the editorial tile look (framed cover + kicker · serif title · tabular caption) over the grid. The tile is the
// CONSUMER's renderItem (GV-1); gallery-view just lays it out.
export const Editorial: Story = {
  render: () => (
    <View width={720} maxWidth="100%">
      <GalleryView<Item> items={ITEMS} getKey={(i) => i.id} renderItem={editorialTile} aria-label="Collections" />
    </View>
  ),
}

// P4 — getWeight: featured tiles (weight 2) are visibly wider; they collapse to the base floor on a narrow canvas.
export const Weighted: Story = {
  render: () => (
    <View width={760} maxWidth="100%">
      <GalleryView<Item>
        items={ITEMS}
        getKey={(i) => i.id}
        renderItem={editorialTile}
        getWeight={(i) => i.weight ?? 1}
        aria-label="Collections"
      />
    </View>
  ),
}

// Density — the grid gap.
export const Density: Story = {
  render: () => (
    <View gap={24} width={640} maxWidth="100%">
      {(['compact', 'default', 'spacious'] as const).map((d) => (
        <Section key={d} label={`density: ${d}`}>
          <GalleryView<Item>
            items={ITEMS.slice(0, 4)}
            getKey={(i) => i.id}
            renderItem={tile}
            density={d}
            aria-label="Photos"
          />
        </Section>
      ))}
    </View>
  ),
}
