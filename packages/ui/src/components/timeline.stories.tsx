import type { Meta, StoryObj } from '@storybook/react-vite'
import { Text, View } from '@tamagui/core'
import { Timeline } from './timeline'
import { type ViewState } from './list-view'
import { Card } from './card'

// UI-2 · V3 · timeline stories — the component Visual Gate surface. Toggle the toolbar Theme (light｜dark).
// timeline is V1's spine laid out as a CONTINUOUS vertical rail (dot + connecting line) with an optional temporal
// label. Rows compose an interactive Card.
//
// MEASURE (v3-timeline.md §5): success sequence — the rail is CONTINUOUS across items (no dashes at the gaps), trims
// to the dot at first/last (no overhang) · getLabel dates align near each dot · loading = N dot-only skeleton rows
// (no shimmer) · empty/error status messages · LONE item = a dot with NO line · density gap · dark mode.

type Event = { id: string; when: string; title: string; detail: string }
const EVENTS: Event[] = [
  { id: 'a', when: 'Aug 7', title: 'UI-1 primitives', detail: '10 primitives shipped' },
  { id: 'b', when: 'Aug 9', title: 'UI-2 · V1 list-view', detail: 'the data-view spine' },
  { id: 'c', when: 'Aug 10', title: 'UI-2 · V2 gallery-view', detail: 'responsive grid' },
  { id: 'd', when: 'Aug 10', title: 'UI-2 · V3 timeline', detail: 'the continuous rail' },
]

const row = (e: Event) => (
  <Card interactive onPress={() => {}} padding="compact" header={
    <Text fontFamily="$display" fontSize={14} fontWeight="600" color="$colorTextPrimary">{e.title}</Text>
  }>
    <Text fontSize={13} color="$colorTextMuted">{e.detail}</Text>
  </Card>
)
const label = (e: Event) => e.when

const Section = ({ label: l, children }: { label: string; children: React.ReactNode }) => (
  <View gap={8} marginBottom={24} width={420} maxWidth="100%">
    <Text fontSize={12} opacity={0.6} color="$colorTextPrimary">{l}</Text>
    {children}
  </View>
)

type PlaygroundArgs = { state: ViewState; density: 'compact' | 'default' | 'spacious'; withLabels: boolean }

const meta: Meta<PlaygroundArgs> = {
  title: 'Platform Views/Timeline',
  argTypes: {
    state: { control: 'select', options: ['loading', 'empty', 'error', 'success'] },
    density: { control: 'select', options: ['compact', 'default', 'spacious'] },
    withLabels: { control: 'boolean' },
  },
}
export default meta
type Story = StoryObj<PlaygroundArgs>

export const Playground: Story = {
  args: { state: 'success', density: 'default', withLabels: true },
  render: (args) => (
    <View width={420} maxWidth="100%">
      <Timeline<Event>
        items={EVENTS}
        getKey={(e) => e.id}
        renderItem={row}
        getLabel={args.withLabels ? label : undefined}
        state={args.state}
        density={args.density}
        aria-label="Release history"
      />
    </View>
  ),
}

export const TerminalStates: Story = {
  render: () => (
    <View flexDirection="row" gap={32} flexWrap="wrap">
      <Section label="success (continuous rail + labels)">
        <Timeline<Event> items={EVENTS} getKey={(e) => e.id} renderItem={row} getLabel={label} aria-label="History" />
      </Section>
      <Section label="loading (5 dot-only skeleton rows · no shimmer)">
        <Timeline<Event> items={[]} getKey={(e) => e.id} renderItem={row} state="loading" aria-label="History" />
      </Section>
      <Section label="empty (role=status)">
        <Timeline<Event> items={[]} getKey={(e) => e.id} renderItem={row} state="empty" />
      </Section>
      <Section label="error (role=status)">
        <Timeline<Event> items={[]} getKey={(e) => e.id} renderItem={row} state="error" />
      </Section>
    </View>
  ),
}

// Edge case — a lone item renders a dot with NO line (no dangling nub).
export const LoneItem: Story = {
  render: () => (
    <Section label="lone item — dot only, no line">
      <Timeline<Event> items={[EVENTS[1]!]} getKey={(e) => e.id} renderItem={row} getLabel={label} aria-label="History" />
    </Section>
  ),
}

export const Density: Story = {
  render: () => (
    <View flexDirection="row" gap={32} flexWrap="wrap">
      {(['compact', 'default', 'spacious'] as const).map((d) => (
        <Section key={d} label={`density: ${d}`}>
          <Timeline<Event> items={EVENTS.slice(0, 3)} getKey={(e) => e.id} renderItem={row} getLabel={label} density={d} aria-label="History" />
        </Section>
      ))}
    </View>
  ),
}
