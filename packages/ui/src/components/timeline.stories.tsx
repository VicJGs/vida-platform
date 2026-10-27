import type { Meta, StoryObj } from '@storybook/react-vite'
import { Text, View } from '@tamagui/core'
import { Timeline, type TemporalState } from './timeline'
import { type ViewState } from './list-view'
import { Card } from './card'

// UI-2 · V3 · timeline stories — the component Visual Gate surface. Toggle the toolbar Theme (light｜dark).
// timeline is V1's spine laid out as a CONTINUOUS vertical rail (dot + connecting line) with an optional temporal
// label. Rows compose an interactive Card.
//
// MEASURE (v3-timeline.md §5 + P3-timeline.md §4): success sequence — the rail is CONTINUOUS across items (no dashes at
// the gaps), trims to the dot at first/last (no overhang) · the date sits in a serif+eyebrow LEFT GUTTER, aligned near
// each dot · hollow resting dots · present = accent dot + soft ring · future = faded DOT (date held at full AA) ·
// now-fulcrum = an accent "now" divider before the first non-past item (rail connects through it) · loading = N dot-only
// skeleton rows (no shimmer) · empty/error status messages · LONE item = a dot with NO line · density gap · dark mode.

type Event = { id: string; when: string; eyebrow?: string; title: string; detail: string; temporal?: TemporalState }
const EVENTS: Event[] = [
  { id: 'a', when: 'Aug 7', eyebrow: 'Mon', title: 'UI-1 primitives', detail: '10 primitives shipped' },
  { id: 'b', when: 'Aug 9', eyebrow: 'Wed', title: 'UI-2 · V1 list-view', detail: 'the data-view spine' },
  { id: 'c', when: 'Aug 10', eyebrow: 'Thu', title: 'UI-2 · V2 gallery-view', detail: 'responsive grid' },
  { id: 'd', when: 'Aug 10', eyebrow: 'Thu', title: 'UI-2 · V3 timeline', detail: 'the continuous rail' },
]

// A now-aware journal fixture — past (written record) → now → future (intention).
const JOURNAL: Event[] = [
  {
    id: 'p1',
    when: '09:30',
    eyebrow: 'Today',
    title: 'Shipped the re-plan draft',
    detail: '2h40 of deep focus before noon.',
    temporal: 'past',
  },
  {
    id: 'p2',
    when: '4',
    eyebrow: 'Yesterday',
    title: 'Reviewed finance import',
    detail: 'conciliation pass',
    temporal: 'past',
  },
  { id: 'f1', when: '2', eyebrow: 'Fri', title: '1:1 with Ana', detail: 'upcoming', temporal: 'future' },
  { id: 'f2', when: '5', eyebrow: 'Mon', title: 'Draft the Q3 review', detail: 'intention', temporal: 'future' },
]

const row = (e: Event) => (
  <Card
    interactive
    onPress={() => {}}
    padding="compact"
    header={
      <Text fontFamily="$display" fontSize={14} fontWeight="600" color="$colorTextPrimary">
        {e.title}
      </Text>
    }
  >
    <Text fontSize={13} color="$colorTextMuted">
      {e.detail}
    </Text>
  </Card>
)
const label = (e: Event) => e.when
const eyebrow = (e: Event) => e.eyebrow ?? null

const Section = ({ label: l, children }: { label: string; children: React.ReactNode }) => (
  <View gap={8} marginBottom={24} width={420} maxWidth="100%">
    {/* solid muted token (AA-safe across presets) — NOT primary@opacity, which composites < 4.5 on warm-light surfaces */}
    <Text fontSize={12} color="$colorTextMuted">
      {l}
    </Text>
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
        getEyebrow={args.withLabels ? eyebrow : undefined}
        state={args.state}
        density={args.density}
        aria-label="Release history"
      />
    </View>
  ),
}

// P3 — the editorial gutter: serif tabular date + uppercase eyebrow kicker, hollow dots.
export const Editorial: Story = {
  render: () => (
    <Section label="serif + eyebrow date gutter · hollow dots">
      <Timeline<Event>
        items={EVENTS}
        getKey={(e) => e.id}
        renderItem={row}
        getLabel={label}
        getEyebrow={eyebrow}
        aria-label="Release history"
      />
    </Section>
  ),
}

// P3 — now-awareness: past (hollow) · present (accent + ring) · future (faded dot, date held at AA).
export const TemporalStates: Story = {
  render: () => {
    const items: Event[] = [
      { id: 'x', when: 'Mon', eyebrow: 'Past', title: 'Recorded', detail: 'written record', temporal: 'past' },
      { id: 'y', when: 'Now', eyebrow: 'Today', title: 'Happening', detail: 'the now moment', temporal: 'present' },
      { id: 'z', when: 'Fri', eyebrow: 'Soon', title: 'Intended', detail: 'light intention', temporal: 'future' },
    ]
    return (
      <Section label="temporal dot tones (past · present+ring · future-faded)">
        <Timeline<Event>
          items={items}
          getKey={(e) => e.id}
          renderItem={row}
          getLabel={label}
          getEyebrow={eyebrow}
          getTemporalState={(e) => e.temporal!}
          aria-label="Temporal states"
        />
      </Section>
    )
  },
}

// P3 — the now-fulcrum journal: an accent "now" divider before the first non-past item; the rail connects through it.
export const NowFulcrum: Story = {
  render: () => (
    <Section label="now-fulcrum — past record → now → future intention">
      <Timeline<Event>
        items={JOURNAL}
        getKey={(e) => e.id}
        renderItem={row}
        getLabel={label}
        getEyebrow={eyebrow}
        getTemporalState={(e) => e.temporal!}
        nowFulcrum
        aria-label="Journal"
      />
    </Section>
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
      <Timeline<Event>
        items={[EVENTS[1]!]}
        getKey={(e) => e.id}
        renderItem={row}
        getLabel={label}
        aria-label="History"
      />
    </Section>
  ),
}

export const Density: Story = {
  render: () => (
    <View flexDirection="row" gap={32} flexWrap="wrap">
      {(['compact', 'default', 'spacious'] as const).map((d) => (
        <Section key={d} label={`density: ${d}`}>
          <Timeline<Event>
            items={EVENTS.slice(0, 3)}
            getKey={(e) => e.id}
            renderItem={row}
            getLabel={label}
            density={d}
            aria-label="History"
          />
        </Section>
      ))}
    </View>
  ),
}
